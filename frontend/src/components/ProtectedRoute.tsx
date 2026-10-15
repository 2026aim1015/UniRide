import type { ReactNode } from "react";

type Props = { allowed: boolean; children: ReactNode };

/** UI-level role gate only. The FastAPI backend must enforce authorization too. */
export function ProtectedRoute({ allowed, children }: Props) {
  if (!allowed) {
    return <section className="panel" role="status">
      <div className="eyebrow">RESTRICTED AREA</div>
      <h2>Admin access required</h2>
      <p className="muted">Your account is not authorized to view this area. Contact a project administrator if you believe this is incorrect.</p>
    </section>;
  }
  return <>{children}</>;
}
