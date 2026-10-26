import { createContext, use } from 'react'

export const ToastContext = createContext(null)

/** `toast(message, tone?)` shows a short confirmation; tone is 'success' | 'error'. */
export function useToast() {
  const ctx = use(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
