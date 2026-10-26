import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import FormField from '../components/FormField'
import { returnPath, useAuth } from '../context/auth-context'
import { EMAIL_PATTERN, friendlyAuthError } from '../lib/authErrors'
import { isDisplayNameTaken } from '../services/db'
import './auth.css'

const FIELDS = ['displayName', 'email', 'password']

function validate({ displayName, email, password }) {
  const errors = {}
  const name = displayName.trim()
  if (name.length < 2 || name.length > 30) errors.displayName = 'Display name is required (2–30 characters).'
  if (!email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (password.length < 6) errors.password = 'Password must be at least 6 characters.'
  return errors
}

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ displayName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef(null)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const focusField = (field) => ({ displayName: nameRef, email: emailRef, password: passwordRef })[field].current?.focus()

  const update = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    const found = validate(values)
    // Display names are public and unique (ignoring case): check before creating the account
    if (!found.displayName && (await isDisplayNameTaken(values.displayName))) {
      found.displayName = 'That display name is taken. Try another one.'
    }
    setErrors(found)
    const firstBad = FIELDS.find((f) => found[f])
    if (firstBad) return focusField(firstBad)

    setSubmitting(true)
    const { error } = await signUp(values)
    setSubmitting(false)
    if (error) {
      const message = friendlyAuthError(error, 'signup')
      // Show field-specific problems next to their field
      if (error.code === 'user_already_exists') {
        setErrors({ email: message })
        focusField('email')
      } else if (error.code === 'unexpected_failure') {
        setErrors({ displayName: message })
        focusField('displayName')
      } else if (error.code === 'weak_password') {
        setErrors({ password: message })
        focusField('password')
      } else {
        setFormError(message)
      }
      return
    }
    navigate(returnPath(location.state?.from), { replace: true })
  }

  return (
    <div className="auth container">
      <title>Sign Up · BookWorm</title>
      <form className="auth-card" onSubmit={handleSubmit} noValidate aria-labelledby="signup-title">
        <h1 id="signup-title" className="auth-title">
          Join BookWorm
        </h1>
        <p className="auth-lead muted">Save books, track your reading and write logs.</p>

        {formError && (
          <p className="auth-alert" role="alert">
            {formError}
          </p>
        )}

        <FormField
          label="Display name"
          hint="(shown on your logs)"
          autoComplete="nickname"
          maxLength={30}
          value={values.displayName}
          onChange={update('displayName')}
          error={errors.displayName}
          inputRef={nameRef}
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={update('email')}
          error={
            errors.email &&
            (errors.email.startsWith('An account') ? (
              <>
                {errors.email.replace(' Try logging in.', '')}{' '}
                <Link to="/login" state={location.state}>
                  Log in?
                </Link>
              </>
            ) : (
              errors.email
            ))
          }
          inputRef={emailRef}
        />
        <FormField
          label="Password"
          hint="(at least 6 characters)"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          inputRef={passwordRef}
        />

        <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="auth-switch">
          Have an account?{' '}
          <Link to="/login" state={location.state}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}
