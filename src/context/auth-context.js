import { createContext, use } from 'react'

export const AuthContext = createContext(null)

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// Where to send someone after login: the page they were trying to reach, or Home
export function returnPath(from) {
  if (!from) return '/'
  if (typeof from === 'string') return from.startsWith('/') ? from : '/'
  return `${from.pathname ?? '/'}${from.search ?? ''}`
}
