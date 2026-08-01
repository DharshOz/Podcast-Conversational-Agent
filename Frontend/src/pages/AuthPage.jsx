/**
 * AuthPage — Login / Register card with mode toggle.
 * Shows inline error messages; on success stores the JWT and redirects.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login, register } from '../api'

const MicIcon = () => (
  <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 016 0v8.25a3 3 0 01-3 3z" />
  </svg>
)

function humanError(err) {
  const s = err?.status
  if (s === 400) return err.message.includes('taken') ? 'Username is already taken.' : 'Invalid request.'
  if (s === 401) return 'Incorrect username or password.'
  if (s === 422) return 'Please fill in all fields correctly.'
  return err?.message || 'Something went wrong. Please try again.'
}

export default function AuthPage() {
  const { saveToken } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggle = () => { setMode(m => m === 'login' ? 'register' : 'login'); setError(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      let data
      if (mode === 'login') {
        data = await login(username, password)
      } else {
        data = await register(username, password)
      }
      saveToken(data.access_token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(humanError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] relative overflow-hidden px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-700/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-900/30 blur-[120px]" />
      </div>

      <div className="glass-card w-full max-w-md p-8 animate-fade-in z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="p-3 rounded-2xl bg-brand-500/20 border border-brand-500/30">
            <MicIcon />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Podcast RAG Agent</h1>
          <p className="text-sm text-white/40">
            {mode === 'login' ? 'Welcome back — sign in to continue.' : 'Create an account to get started.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" id="auth-form">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className="input-field"
              placeholder="your_username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="input-field"
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          {error && (
            <div id="auth-error" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
              {error}
            </div>
          )}

          <button id="auth-submit" type="submit" className="btn-primary mt-1" disabled={loading}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-white/30 mt-6">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            id="auth-toggle"
            onClick={toggle}
            className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            type="button"
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}
