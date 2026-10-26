import { useId } from 'react'
import './ui.css'

// Read-only star rating, e.g. on a log.
export function Stars({ value }) {
  if (!value) return null
  return (
    <span className="stars" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'is-on' : ''} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}

// Optional 1–5 rating input: a radio group plus a "Clear" button.
export function StarInput({ value, onChange, disabled }) {
  const name = useId()
  return (
    <fieldset className="star-input" disabled={disabled}>
      <legend className="star-legend">
        Rating <span className="muted">(optional)</span>
      </legend>
      <div className="star-options">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`star-option ${value && n <= value ? 'is-on' : ''}`}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="visually-hidden"
            />
            <span aria-hidden="true">★</span>
            <span className="visually-hidden">{n === 1 ? '1 star' : `${n} stars`}</span>
          </label>
        ))}
        {value ? (
          <button type="button" className="star-clear" onClick={() => onChange(null)}>
            Clear
          </button>
        ) : (
          <span className="star-none muted">No rating</span>
        )}
      </div>
    </fieldset>
  )
}
