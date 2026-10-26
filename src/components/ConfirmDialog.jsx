import { useEffect, useId, useRef } from 'react'
import './ui.css'

// Modal confirmation built on <dialog>: traps focus, closes on Esc, and
// returns focus to whatever opened it.
export default function ConfirmDialog({ open, title, children, confirmLabel, busyLabel, busy = false, onConfirm, onClose }) {
  const ref = useRef(null)
  const cancelRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      cancelRef.current?.focus() // safest default for a destructive action
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose() // click on the backdrop
      }}
    >
      <div className="confirm-body">
        <h2 id={titleId} className="confirm-title">
          {title}
        </h2>
        <div className="confirm-text">{children}</div>
        <div className="confirm-actions">
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
