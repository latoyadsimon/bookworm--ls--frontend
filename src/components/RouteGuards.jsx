import { Navigate, Outlet, useLocation } from 'react-router'
import { returnPath, useAuth } from '../context/auth-context'

// Logged-in only (My Library). Guests go to Log In and come back afterwards.
export function RequireAuth() {
  const { ready, user } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

// Guests only (Log In, Sign Up). Logged-in users continue to where they were headed.
export function GuestOnly() {
  const { ready, user } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (user) return <Navigate to={returnPath(location.state?.from)} replace />
  return <Outlet />
}
