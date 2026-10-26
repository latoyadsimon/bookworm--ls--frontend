import { useCallback, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { ToastContext } from './toast-context'
import '../components/ui.css'

const DURATION = 4000

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, tone = 'success') => {
      const id = crypto.randomUUID()
      setToasts((list) => [...list.slice(-2), { id, message, tone }])
      timers.current.set(id, setTimeout(() => dismiss(id), tone === 'error' ? DURATION + 2000 : DURATION))
    },
    [dismiss],
  )

  return (
    <ToastContext value={toast}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast is-${t.tone}`}>
            <span className="toast-icon" aria-hidden="true">
              {t.tone === 'error' ? '!' : <Icon name="check" size={16} strokeWidth={3} />}
            </span>
            <span className="toast-message">{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
