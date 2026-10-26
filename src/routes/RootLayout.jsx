import { Outlet, ScrollRestoration } from 'react-router'
import NavBar from '../components/NavBar'
import ThemeBackdrop from '../components/ThemeBackdrop'

export default function RootLayout() {
  return (
    <>
      <ThemeBackdrop />
      <div className="app-shell">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <NavBar />
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
    </>
  )
}
