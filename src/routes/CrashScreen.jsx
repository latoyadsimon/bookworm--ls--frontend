import { useEffect } from 'react'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import StatusScreen from '../components/StatusScreen'
import Icon from '../components/Icon'
import NotFoundPage from './NotFoundPage'

// Route-level Error Boundary. Shows a friendly screen instead of a blank page;
// technical details go to the console only.
export default function CrashScreen() {
  const error = useRouteError()

  useEffect(() => {
    console.error('[BookWorm] Unexpected error:', error)
  }, [error])

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  return (
    <>
      <title>Something went wrong · BookWorm</title>
      <StatusScreen code="Oops" title="Something went wrong" message="Please try again, or head back home.">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          <Icon name="refresh" size={18} /> Try Again
        </button>
        <Link to="/" className="btn btn-secondary">
          <Icon name="home" size={18} /> Go Home
        </Link>
      </StatusScreen>
    </>
  )
}
