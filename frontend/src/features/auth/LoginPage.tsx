import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

type Props = { onSignup: () => void };

export function LoginPage({ onSignup }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.");
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) setError(authError.message);
    } catch {
      setError("Unable to sign in right now. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="eyebrow">CAMPUS MOBILITY, SIMPLIFIED</div>
      <h1 id="login-title">Welcome back.</h1>
      <p className="muted">Sign in to find your next ride.</p>
      <form onSubmit={submit} className="form">
        <label>Email address
          <input type="email" autoComplete="email" required value={email}
            onChange={event => setEmail(event.target.value)} placeholder="you@college.edu" />
        </label>
        <label>Password
          <input type="password" autoComplete="current-password" required minLength={8} value={password}
            onChange={event => setPassword(event.target.value)} placeholder="Your password" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="switch-auth">New to UniRide? <button type="button" className="text-button" onClick={onSignup}>Create account</button></p>
      <p className="tiny muted">Use your campus-approved account. Institutional verification must be configured before production use.</p>
    </section>
  );
}
