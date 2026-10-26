import BookCard, { BookCardSkeleton } from '../components/BookCard'
import StateMessage from '../components/StateMessage'
import { useLoad } from '../hooks/useLoad'
import { useTheme } from '../context/theme-context'
import { listFeatured } from '../services/featuredApi'
import { formatMonth } from '../lib/format'
import './browse.css'

const currentMonth = () => new Date().toISOString().slice(0, 7)

// Every monthly pick, newest first.
export default function FeaturedPage() {
  const { mode } = useTheme()
  const kids = mode === 'kid-korner'
  return <FeaturedList key={String(kids)} kids={kids} />
}

function FeaturedList({ kids }) {
  const res = useLoad(
    () =>
      listFeatured().then(
        (data) => ({ data, error: null }),
        (error) => ({ data: null, error }),
      ),
    'all',
  )
  const books = res.data?.filter((b) => !kids || b.maturityRating !== 'MATURE')
  const now = currentMonth()

  return (
    <div className="browse container">
      <title>Featured Picks · BookWorm</title>
      <h1 className="browse-title">Featured Picks</h1>
      <p className="browse-sub muted">One book each month, chosen from the New York Times Best Sellers.</p>

      {res.status === 'error' ? (
        <StateMessage tone="error" title="We couldn't load the featured picks." onRetry={res.reload}>
          {res.error.message}
        </StateMessage>
      ) : res.status === 'ready' && books.length === 0 ? (
        <StateMessage title="No featured picks yet.">
          <p>The first pick of each month shows up here.</p>
        </StateMessage>
      ) : (
        <ul className="book-grid" role="list" aria-label="Featured picks" aria-busy={res.status === 'loading'}>
          {res.status === 'loading'
            ? Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <BookCardSkeleton />
                </li>
              ))
            : books.map((book) => (
                <li key={book.id} className="featured-item">
                  <BookCard book={book} />
                  <span className="featured-month">
                    {formatMonth(book.month)}
                    {book.month.startsWith(now) && <span className="featured-now">This month</span>}
                  </span>
                  <span className="featured-label muted">{book.label}</span>
                </li>
              ))}
        </ul>
      )}

      <p className="featured-credit muted">Best-seller data provided by The New York Times.</p>
    </div>
  )
}
