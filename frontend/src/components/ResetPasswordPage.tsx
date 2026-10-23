import { useState, type FormEvent } from 'react'
import { Bike, LockKeyhole, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './AuthPage.css'

// Shown after the user clicks the link in the "reset password" email.
export default function ResetPasswordPage({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    onDone()
  }

  return (
    <main className="auth-page" style={{ gridTemplateColumns: '1fr' }}>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span className="auth-eyebrow"><Bike size={14} /> UNIRIDE</span>
            <h2>Choose a new password</h2>
            <p>Enter a new password for your account.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              New password
              <span className="auth-input">
                <LockKeyhole size={18} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
              </span>
            </label>
            <label>
              Confirm new password
              <span className="auth-input">
                <LockKeyhole size={18} />
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Type it again" autoComplete="new-password" minLength={8} required />
              </span>
            </label>
            {error && <p className="auth-message error">{error}</p>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : 'Save new password'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
