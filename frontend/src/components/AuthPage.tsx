
import { useState, type FormEvent } from 'react'
import { Bike, Mail, LockKeyhole, UserRound, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './AuthPage.css'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
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

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        })

        if (error) throw error

        if (data.session) {
          setMessage('Account created successfully!')
        } else {
          setMessage(
            'Account created. Check your email to confirm your account, then sign in.'
          )
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }

  function changeMode(next: 'login' | 'signup') {
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
              {mode === 'login' ? 'WELCOME BACK' : 'JOIN UNIRIDE'}
            </span>
            <h2>
              {mode === 'login'
                ? 'Good to see you.'
                : 'Let’s get you moving.'}
            </h2>
            <p>
              {mode === 'login'
                ? 'Sign in to continue your campus journey.'
                : 'Create your account to start riding.'}
            </p>
          </div>

          <div className="auth-tabs">
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
          </div>

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
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            <label>
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
            </label>

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
                  : 'Create account'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-terms">
            By continuing, you agree to use UniRide responsibly
            and follow campus bicycle-sharing rules.
          </p>
        </div>
      </section>
    </main>
  )
}
