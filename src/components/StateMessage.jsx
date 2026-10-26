import Icon from './Icon'

// Empty / error message with an optional action (usually Retry).
// Errors are announced to screen readers; empty states are not.
export default function StateMessage({ tone = 'empty', title, children, onRetry, retryLabel = 'Retry', compact = false }) {
  return (
    <div
      className={`state-message is-${tone} ${compact ? 'is-compact' : ''}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      {title && <p className="state-message-title">{title}</p>}
      {children && <div className="state-message-body">{children}</div>}
      {onRetry && (
        <button type="button" className="btn btn-secondary state-message-action" onClick={onRetry}>
          <Icon name="refresh" size={18} /> {retryLabel}
        </button>
      )}
    </div>
  )
}
