
import { useState, type FormEvent } from 'react'
import { Bike, Mail, LockKeyhole, UserRound, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './AuthPage.css'

// Optional: only allow one email domain (example: iitrpr.ac.in). Leave empty to allow any email.
const ALLOWED_DOMAIN = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN ?? '').trim().toLowerCase()

type Mode = 'login' | 'signup' | 'forgot'

function friendlyError(raw: string): string {
  const text = raw.toLowerCase()
  if (text.includes('invalid login credentials')) return 'Wrong email or password.'
  if (text.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox (and spam folder).'
  if (text.includes('already registered')) return 'This email already has an account. Please sign in.'
  if (text.includes('rate limit')) return 'Too many attempts. Please wait a few minutes and try again.'
  if (text.includes('failed to fetch')) return 'Cannot reach the server. Check your internet connection.'
  return raw
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const cleanEmail = email.trim().toLowerCase()

    try {
      if (mode !== 'login' && ALLOWED_DOMAIN && !cleanEmail.endsWith('@' + ALLOWED_DOMAIN)) {
        throw new Error(`Please use your @${ALLOWED_DOMAIN} email address.`)
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error

        // Supabase hides "email already exists" by returning a user with no identities.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('This email already has an account. Please sign in.')
        }

        setMessage(
          data.session
            ? 'Account created successfully!'
            : 'Account created. Check your email and click the confirmation link, then sign in.'
        )
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMessage('If this email has an account, a password reset link has been sent.')
      }
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : 'Something went wrong.'))
    } finally {
      setLoading(false)
    }
  }

  function changeMode(next: Mode) {
    setMode(next)
    setError('')
    setMessage('')
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <a className="auth-brand" href="/">
          <span className="auth-brand-icon"><Bike size={25} /></span>
          <span>UniRide<span className="auth-brand-dot">.</span></span>
        </a>

        <div className="auth-hero">
          <span className="auth-eyebrow">YOUR CAMPUS. YOUR RIDE.</span>
          <h1>A better way<br />to move around<br /><span>campus.</span></h1>
          <p>
            Find a bicycle, explore campus, and make
            every journey a little greener.
          </p>

          <div className="auth-feature">
            <span>01</span>
            <div>
              <strong>Find your ride</strong>
              <p>Discover bicycles near you.</p>
            </div>
          </div>

          <div className="auth-feature">
            <span>02</span>
            <div>
              <strong>Ride with ease</strong>
              <p>Start your next campus journey.</p>
            </div>
          </div>
        </div>

        <p className="auth-visual-footer">
          Made for a greener campus · IIT Ropar
        </p>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <Bike size={24} /> UniRide.
          </div>

          <div className="auth-heading">
            <span className="auth-eyebrow">
              {mode === 'login' ? 'WELCOME BACK' : mode === 'signup' ? 'JOIN UNIRIDE' : 'RESET PASSWORD'}
            </span>
            <h2>
              {mode === 'login'
                ? 'Good to see you.'
                : mode === 'signup'
                  ? 'Let’s get you moving.'
                  : 'Forgot your password?'}
            </h2>
            <p>
              {mode === 'login'
                ? 'Sign in to continue your campus journey.'
                : mode === 'signup'
                  ? 'Create your account to start riding.'
                  : 'Enter your email and we will send you a reset link.'}
            </p>
          </div>

          {mode !== 'forgot' && <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => changeMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => changeMode('signup')}
            >
              Create account
            </button>
          </div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Full name
                <span className="auth-input">
                  <UserRound size={18} />
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </span>
              </label>
            )}

            <label>
              Institute email
              <span className="auth-input">
                <Mail size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={ALLOWED_DOMAIN ? `you@${ALLOWED_DOMAIN}` : 'you@example.com'}
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            {mode !== 'forgot' && <label>
              Password
              <span className="auth-input">
                <LockKeyhole size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  minLength={8}
                  required
                />
              </span>
            </label>}

            {mode === 'login' && (
              <button type="button" className="auth-link" onClick={() => changeMode('forgot')}>
                Forgot password?
              </button>
            )}

            {error && <p className="auth-message error">{error}</p>}
            {message && <p className="auth-message success">{message}</p>}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Send reset link'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {mode === 'forgot' && (
            <button type="button" className="auth-link" onClick={() => changeMode('login')}>
              ← Back to sign in
            </button>
          )}

          <p className="auth-terms">
            By continuing, you agree to use UniRide responsibly
            and follow campus bicycle-sharing rules.
          </p>
        </div>
      </section>
    </main>
  )
}
