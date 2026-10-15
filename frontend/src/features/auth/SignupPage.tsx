import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

type Props = { onLogin: () => void };

export function SignupPage({ onLogin }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.");
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      });
      if (authError) setError(authError.message);
      else setMessage("Account request submitted. Check your email if confirmation is enabled. Admin access is assigned separately.");
    } catch {
      setError("Unable to create your account right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="signup-title">
      <div className="eyebrow">JOIN THE CAMPUS RIDE</div>
      <h1 id="signup-title">Create account.</h1>
      <p className="muted">Set up your student account to get started.</p>
      <form onSubmit={submit} className="form">
        <label>Full name
          <input required minLength={2} autoComplete="name" value={name}
            onChange={event => setName(event.target.value)} placeholder="Your name" />
        </label>
        <label>College email
          <input type="email" required autoComplete="email" value={email}
            onChange={event => setEmail(event.target.value)} placeholder="you@college.edu" />
        </label>
        <label>Password
          <input type="password" required minLength={8} autoComplete="new-password" value={password}
            onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" />
        </label>
        <p className="tiny muted">Use at least 8 characters for your password.</p>
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="success" role="status">{message}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="switch-auth">Already registered? <button type="button" className="text-button" onClick={onLogin}>Sign in</button></p>
    </section>
  );
}
