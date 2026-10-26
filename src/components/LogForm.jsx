import { useId, useRef, useState } from 'react'
import { StarInput } from './Stars'
import './ui.css'

const MAX = 5000

// Write or edit a log. `onSubmit` resolves to true on success; on failure the
// typed text stays so the reader never loses a draft.
export default function LogForm({ initial, submitLabel, busyLabel, onSubmit, onCancel, autoFocus = false }) {
  const [body, setBody] = useState(initial?.body ?? '')
  const [rating, setRating] = useState(initial?.rating ?? null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const textRef = useRef(null)
  const id = useId()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim()) {
      setError("Log can't be empty.")
      textRef.current?.focus()
      return
    }
    setBusy(true)
    const ok = await onSubmit({ body: body.trim(), rating })
    setBusy(false)
    if (ok && !initial) {
      setBody('')
      setRating(null)
    }
  }

  return (
    <form className="log-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor={`${id}-body`} className="field-label">
        {initial ? 'Edit your log' : 'What did you read? What do you think?'}
      </label>
      <textarea
        id={`${id}-body`}
        ref={textRef}
        className={`log-textarea ${error ? 'has-error' : ''}`}
        rows={initial ? 4 : 5}
        maxLength={MAX}
        value={body}
        autoFocus={autoFocus}
        disabled={busy}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={`${id}-count${error ? ` ${id}-err` : ''}`}
        onChange={(e) => {
          setBody(e.target.value)
          if (error) setError(null)
        }}
      />
      <div className="log-form-meta">
        {error ? (
          <p id={`${id}-err`} className="field-error">
            {error}
          </p>
        ) : (
          <span />
        )}
        <span id={`${id}-count`} className="log-count muted">
          {body.length}/{MAX}
        </span>
      </div>
      <StarInput value={rating} onChange={setRating} disabled={busy} />
      <div className="log-form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? busyLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}
