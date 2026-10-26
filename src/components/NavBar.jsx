import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import Icon from './Icon'
import SearchBar from './SearchBar'
import GenresMenu from './GenresMenu'
import ModePicker from './ModePicker'
import { GENRES } from '../data/genres'
import { useAuth } from '../context/auth-context'
import './NavBar.css'

const navClass = ({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`

export default function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const menuButton = useRef(null)

  // Close the mobile panels whenever the route changes
  const routeKey = location.pathname + location.search
  const [lastRoute, setLastRoute] = useState(routeKey)
  if (routeKey !== lastRoute) {
    setLastRoute(routeKey)
    setMenuOpen(false)
    setSearchOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    // Esc closes the menu and puts focus back on its button (focus was inside the removed panel)
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      menuButton.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Log In / Sign Up remember the current page so you come back to it
  const onAuthPage = ['/login', '/signup'].includes(location.pathname)
  const authState = onAuthPage ? location.state : { from: location }

  async function handleLogout() {
    // Leave first: signing out on a protected page (My Library) would otherwise
    // trigger its guard and redirect to Log In instead of Home
    navigate('/', { replace: true })
    await signOut()
  }

  // Remount the search form on new searches so it pre-fills from the URL
  const searchKey = location.pathname === '/search' ? location.search : 'search'

  return (
    <header className="site-header">
      <nav className="nav container" aria-label="Main">
        <Link to="/" className="nav-logo" aria-label="BookWorm home">
          <Icon name="book" size={26} className="nav-logo-icon" />
          <span className="nav-logo-text">BookWorm</span>
        </Link>

        <ul className="nav-links" role="list">
          <li>
            <NavLink to="/" end className={navClass}>
              Home
            </NavLink>
          </li>
          <li>
            <GenresMenu />
          </li>
          <li>
            <NavLink to="/featured" className={navClass}>
              Featured
            </NavLink>
          </li>
        </ul>

        <SearchBar key={searchKey} className="nav-search" />

        <div className="nav-actions">
          <button
            type="button"
            className="icon-btn nav-mobile-only"
            aria-label={searchOpen ? 'Close search' : 'Open search'}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((o) => !o)
              setMenuOpen(false)
            }}
          >
            <Icon name={searchOpen ? 'close' : 'search'} />
          </button>
          <ModePicker />
          <div className="nav-auth">
            {user ? (
              <>
                <NavLink to="/library" className={navClass}>
                  My Library
                </NavLink>
                <span className="nav-user" title="Your display name">
                  {profile?.display_name}
                </span>
                <button type="button" className="btn btn-secondary nav-logout" onClick={handleLogout}>
                  Log Out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" state={authState} className={navClass}>
                  Log In
                </NavLink>
                <Link to="/signup" state={authState} className="btn btn-primary nav-signup">
                  Sign Up
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            ref={menuButton}
            className="icon-btn nav-mobile-only"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => {
              setMenuOpen((o) => !o)
              setSearchOpen(false)
            }}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </nav>

      {searchOpen && (
        <div className="nav-mobile-search container">
          <SearchBar key={`m-${searchKey}`} autoFocus onSearched={() => setSearchOpen(false)} />
        </div>
      )}

      {menuOpen && (
        <div id="mobile-menu" className="mobile-menu">
          <ul className="container" role="list">
            <li>
              <NavLink to="/" end className={navClass}>
                Home
              </NavLink>
            </li>
            <li className="mobile-menu-group">
              <span className="mobile-menu-label">Genres</span>
              <ul role="list" className="mobile-genres">
                {GENRES.map((g) => (
                  <li key={g.slug}>
                    <NavLink to={`/genre/${g.slug}`} className={navClass}>
                      {g.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <NavLink to="/featured" className={navClass}>
                Featured
              </NavLink>
            </li>
            {user ? (
              <>
                <li>
                  <NavLink to="/library" className={navClass}>
                    My Library
                  </NavLink>
                </li>
                <li className="mobile-menu-user muted">Signed in as {profile?.display_name}</li>
                <li>
                  <button type="button" className="nav-link" onClick={handleLogout}>
                    Log Out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink to="/login" state={authState} className={navClass}>
                    Log In
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/signup" state={authState} className={navClass}>
                    Sign Up
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  )
}
