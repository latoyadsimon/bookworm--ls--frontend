import { Link } from 'react-router'
import StatusScreen from '../components/StatusScreen'
import Icon from '../components/Icon'

export default function NotFoundPage() {
  return (
    <>
      <title>Page not found · BookWorm</title>
      <StatusScreen code="404" title="Page not found" message="This page wandered off the shelf. Let's get you back to the books.">
        <Link to="/" className="btn btn-primary">
          <Icon name="home" size={18} /> Go Home
        </Link>
      </StatusScreen>
    </>
  )
}
