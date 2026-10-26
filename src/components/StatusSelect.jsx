import { useId } from 'react'
import { STATUS_LABELS } from '../lib/format'
import Icon from './Icon'
import { useTheme } from '../context/theme-context'
import { statusIcon } from '../theme/modes'
import './ui.css'

// Reading status dropdown. Saves on change; shows a "Saved" note when done.
export default function StatusSelect({ value, onChange, saving = false, saved = false, compact = false, bookTitle }) {
  const id = useId()
  const { mode } = useTheme()
  return (
    <div className={`status-select ${compact ? 'is-compact' : ''}`}>
      <label htmlFor={id} className={compact ? 'visually-hidden' : 'status-label'}>
        Reading status{compact && bookTitle ? ` for ${bookTitle}` : ''}
      </label>
      <div className="status-row">
        <select id={id} className="status-control" value={value} disabled={saving} onChange={(e) => onChange(e.target.value)}>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {statusIcon(mode, key)} {label}
            </option>
          ))}
        </select>
        <span className="status-note" aria-live="polite">
          {saving ? 'Saving…' : saved ? (
            <>
              <Icon name="check" size={14} strokeWidth={3} /> Saved
            </>
          ) : null}
        </span>
      </div>
    </div>
  )
}
