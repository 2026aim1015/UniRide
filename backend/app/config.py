from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "UniRide API"
    api_v1_prefix: str = "/api/v1"
    database_url: str
    supabase_url: str = ""
    supabase_anon_key: str = ""
    cors_origins: str = "http://localhost:5173"
    auto_create_tables: bool = False
    # Basic per-client rate limit (requests per minute). Set 0 to disable.
    rate_limit_per_minute: int = 240
    rate_limit_write_per_minute: int = 60

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()
