import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/auth-context'
import { useToast } from '../context/toast-context'
import { isSessionExpired } from '../lib/authErrors'

// Shows the right message when a save fails. An expired session signs the
// reader out and sends them to Log In, then back to this page.
export function useSaveError() {
  const toast = useToast()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(
    async (error, message) => {
      if (isSessionExpired(error)) {
        toast('Your session expired. Please log in again.', 'error')
        await signOut()
        navigate('/login', { state: { from: location } })
        return
      }
      toast(message, 'error')
    },
    [toast, signOut, navigate, location],
  )
}
