import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import FormField from '../components/FormField'
import { returnPath, useAuth } from '../context/auth-context'
import { EMAIL_PATTERN, friendlyAuthError } from '../lib/authErrors'
import { DEMO_LOGIN } from '../lib/demoLogin'
import './auth.css'

function validate({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  return errors
}

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  const update = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    setFormError(null)
    if (found.email) return emailRef.current?.focus()
    if (found.password) return passwordRef.current?.focus()

    setSubmitting(true)
    const { error } = await signIn(values)
    setSubmitting(false)
    if (error) {
      setFormError(friendlyAuthError(error, 'login'))
      return
    }
    navigate(returnPath(from), { replace: true })
  }

  return (
    <div className="auth container">
      <title>Log In · BookWorm</title>
      <form className="auth-card" onSubmit={handleSubmit} noValidate aria-labelledby="login-title">
        <h1 id="login-title" className="auth-title">
          Welcome back
        </h1>
        {from && <p className="auth-lead muted">Log in to continue where you left off.</p>}

        {formError && (
          <p className="auth-alert" role="alert">
            {formError}
          </p>
        )}

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={update('email')}
          error={errors.email}
          inputRef={emailRef}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          inputRef={passwordRef}
        />

        <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Log In'}
        </button>

        <p className="auth-switch">
          New here?{' '}
          <Link to="/signup" state={location.state}>
            Sign up
          </Link>
        </p>
      </form>

      <aside className="auth-demo" aria-label="Demo account">
        <p>
          <strong>Trying BookWorm?</strong> Use the demo reader account.
        </p>
        <p className="muted">
          {DEMO_LOGIN.email} · {DEMO_LOGIN.password}
        </p>
        <button
          type="button"
          className="btn btn-ghost auth-demo-btn"
          onClick={() => {
            setValues({ ...DEMO_LOGIN })
            setErrors({})
            setFormError(null)
          }}
        >
          Fill in demo login
        </button>
      </aside>
    </div>
  )
}
