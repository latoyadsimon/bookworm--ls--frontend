import { useCallback, useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import Icon from './Icon'
import { GENRES } from '../data/genres'
import { useDismiss } from '../hooks/useDismiss'

// "Genres ▾" disclosure menu for the desktop nav.
export default function GenresMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const { pathname } = useLocation()
  const menuId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(wrapRef, open, close, buttonRef)

  const onGenrePage = pathname.startsWith('/genre/')

  return (
    <div className="genres" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`nav-link nav-link-button ${onGenrePage ? 'is-active' : ''}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        Genres <Icon name="chevronDown" size={16} className={`chev ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <ul id={menuId} className="genres-menu" role="list">
          {GENRES.map((g) => (
            <li key={g.slug}>
              <NavLink
                to={`/genre/${g.slug}`}
                className={({ isActive }) => `genres-item ${isActive ? 'is-current' : ''}`}
                onClick={close}
              >
                {g.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
