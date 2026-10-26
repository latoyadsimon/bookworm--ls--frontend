import { useEffect } from 'react'

// Closes a popover/menu on Escape or on a click outside `ref`.
// On Escape, focus returns to `returnFocusRef` so keyboard users don't get lost.
export function useDismiss(ref, open, onClose, returnFocusRef) {
  useEffect(() => {
    if (!open) return

    function onKey(e) {
      if (e.key === 'Escape') {
        onClose()
        returnFocusRef?.current?.focus()
      }
    }
    function onPointer(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [ref, open, onClose, returnFocusRef])
}
