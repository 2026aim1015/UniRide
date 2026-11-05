"""Small in-memory sliding-window rate limiter.

Good enough for a single-process campus deployment. If you run several workers or
servers, replace it with a shared store (for example Redis) so limits are shared.
"""
import time
from collections import defaultdict, deque
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

WINDOW_SECONDS = 60
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, per_minute: int, write_per_minute: int):
        super().__init__(app)
        self.per_minute = per_minute
        self.write_per_minute = write_per_minute
        self.hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._last_cleanup = time.monotonic()

    @staticmethod
    def _client_key(request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup(self, now: float) -> None:
        if now - self._last_cleanup < WINDOW_SECONDS:
            return
        self._last_cleanup = now
        for key in [k for k, q in self.hits.items() if not q or now - q[-1] > WINDOW_SECONDS]:
            del self.hits[key]

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path == "/health":
            return await call_next(request)  # never block CORS preflight or health checks

        now = time.monotonic()
        self._cleanup(now)
        bucket = "write" if request.method in WRITE_METHODS else "read"
        limit = self.write_per_minute if bucket == "write" else self.per_minute
        queue = self.hits[(self._client_key(request), bucket)]
        while queue and now - queue[0] > WINDOW_SECONDS:
            queue.popleft()
        if len(queue) >= limit:
            retry_after = max(1, int(WINDOW_SECONDS - (now - queue[0])))
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down and try again shortly."},
                headers={"Retry-After": str(retry_after)},
            )
        queue.append(now)
        return await call_next(request)
