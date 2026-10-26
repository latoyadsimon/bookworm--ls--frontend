import { useState } from 'react'
import { Link } from 'react-router'
import CoverArt from './CoverArt'
import Icon from './Icon'
import StateMessage from './StateMessage'
import { formatAuthors, formatMonth } from '../lib/format'
import { useLoad } from '../hooks/useLoad'
import { useSaveError } from '../hooks/useSaveError'
import { useAuth } from '../context/auth-context'
import { useToast } from '../context/toast-context'
import { useTheme } from '../context/theme-context'
import { modeOrDefault } from '../theme/modes'
import { getCurrentFeatured } from '../services/featuredApi'
import { addToLibrary, getLibraryItem } from '../services/db'
import './FeaturedHero.css'

// This month's featured book at the top of Home.
export default function FeaturedHero({ kids }) {
  const { mode } = useTheme()
  const pick = useLoad(
    () =>
      getCurrentFeatured({ kids }).then(
        (data) => ({ data, error: null }),
        (error) => ({ data: null, error }),
      ),
    kids,
  )
  const book = pick.data

  if (pick.status === 'error') {
    return (
      <div className="container">
        <StateMessage tone="error" title="We couldn't load the featured book." onRetry={pick.reload}>
          {pick.error.message}
        </StateMessage>
      </div>
    )
  }

  if (pick.status === 'ready' && !book) return null // nothing suitable to feature (Kid Korner)

  if (!book) {
    return (
      <div className="hero" aria-hidden="true">
        <div className="hero-cover cover skeleton-block" />
        <div className="hero-body">
          <span className="skeleton-line hero-skel-badge" />
          <span className="skeleton-line hero-skel-title" />
          <span className="skeleton-line hero-skel-meta" />
          <span className="skeleton-line hero-skel-text" />
          <span className="skeleton-line hero-skel-text is-short" />
          <span className="skeleton-block hero-skel-button" />
        </div>
      </div>
    )
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      <Link to={`/books/${book.id}`} className="hero-cover-link" tabIndex={-1} aria-hidden="true">
        <CoverArt book={book} decorative eager className="hero-cover" />
      </Link>
      <div className="hero-body">
        <p className="hero-badge">
          <span className="hero-badge-part">{modeOrDefault(mode).featured}</span>
          <span className="visually-hidden">, </span>
          <span className="hero-badge-dot" aria-hidden="true">
            {' · '}
          </span>
          <span className="hero-badge-part">{formatMonth(book.month)}</span>
        </p>
        <h2 id="hero-title" className="hero-title">
          {book.title}
        </h2>
        <p className="hero-meta">by {formatAuthors(book.authors)}</p>
        <p className="hero-nyt">{book.label}</p>
        {/* No description: show nothing rather than an empty-state block */}
        {book.description && <p className="hero-description">{book.description}</p>}
        <div className="hero-actions">
          <Link to={`/books/${book.id}`} className="btn btn-primary">
            View Details
          </Link>
          <HeroLibraryButton book={book} />
          <Link to="/featured" className="hero-more">
            See past picks{' '}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// Guests go to Log In (and come back to the book); readers save it right here.
function HeroLibraryButton({ book }) {
  const { user } = useAuth()
  if (!user) {
    return (
      <Link to="/login" state={{ from: `/books/${book.id}` }} className="btn btn-secondary">
        + Add to Library
      </Link>
    )
  }
  return <ReaderLibraryButton key={user.id} book={book} userId={user.id} />
}

function ReaderLibraryButton({ book, userId }) {
  const item = useLoad(() => getLibraryItem(userId, book.id), book.id)
  const toast = useToast()
  const saveError = useSaveError()
  const { mode } = useTheme()
  const [busy, setBusy] = useState(false)

  if (item.status === 'loading') {
    return (
      <button type="button" className="btn btn-secondary" disabled>
        Checking your library…
      </button>
    )
  }
  if (item.data) {
    return (
      <Link to="/library" className="btn btn-secondary">
        <Icon name="check" size={18} strokeWidth={3} /> In your library
      </Link>
    )
  }

  async function handleAdd() {
    setBusy(true)
    const { data, error } = await addToLibrary(userId, {
      volume_id: book.id,
      title: book.title,
      authors: book.authors,
      thumbnail_url: book.thumbnail,
    })
    setBusy(false)
    if (error?.code === '23505') return item.reload()
    if (error) return saveError(error, "Couldn't add this book. Please try again.")
    item.setData(data)
    toast(modeOrDefault(mode).added)
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={handleAdd} disabled={busy}>
      {busy ? 'Adding…' : '+ Add to Library'}
    </button>
  )
}
