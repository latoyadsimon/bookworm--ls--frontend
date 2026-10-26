import { useId, useState } from 'react'

// Labelled input with its error directly underneath (announced via aria-describedby).
export default function FormField({ label, hint, error, type = 'text', inputRef, ...inputProps }) {
  const id = useId()
  const [reveal, setReveal] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {hint && (
          <span id={`${id}-hint`} className="field-hint">
            {' '}
            {hint}
          </span>
        )}
      </label>
      <div className="field-control">
        <input
          id={id}
          ref={inputRef}
          type={isPassword && reveal ? 'text' : type}
          className="field-input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="field-reveal"
            aria-pressed={reveal}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            onClick={() => setReveal((r) => !r)}
          >
            {reveal ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
