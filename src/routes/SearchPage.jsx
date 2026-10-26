import { Link, useSearchParams } from 'react-router'
import SearchBar from '../components/SearchBar'
import BookGrid from '../components/BookGrid'
import StateMessage from '../components/StateMessage'
import BookCard, { BookCardSkeleton } from '../components/BookCard'
import { useBookList } from '../hooks/useBookList'
import { useLoad } from '../hooks/useLoad'
import { searchFeatured } from '../services/featuredApi'
import { formatMonth } from '../lib/format'
import { useTheme } from '../context/theme-context'
import { SEARCH_TYPES, normalizeType } from '../lib/searchValidation'
import './browse.css'

function SearchResults({ q, type, kids }) {
  const list = useBookList({ source: 'search', q, type, kids, pageSize: 20 })
  const typeLabel = SEARCH_TYPES.find((t) => t.value === type)?.label

  return (
    <>
      {list.status === 'ready' && list.items.length > 0 && (
        <p className="browse-count muted" aria-live="polite">
          {list.total} {list.total === 1 ? 'book' : 'books'} found · searching by {typeLabel.toLowerCase()}
        </p>
      )}
      <BookGrid
        list={list}
        label={`Results for ${q}`}
        empty={
          <StateMessage title={`No books found for “${q}”.`}>
            <p>Try a different search or search type.</p>
            <Link to="/" className="btn btn-secondary state-message-action">
              Back to Home
            </Link>
          </StateMessage>
        }
      />
    </>
  )
}

// "Featured" searches the monthly picks (title or author) in the browser
function FeaturedResults({ q, kids }) {
  const res = useLoad(
    () =>
      searchFeatured(q).then(
        (items) => ({ data: items.filter((b) => !kids || b.maturityRating !== 'MATURE'), error: null }),
        (error) => ({ data: null, error }),
      ),
    q,
  )

  if (res.status === 'error') {
    return (
      <StateMessage tone="error" title="We couldn't load the featured picks." onRetry={res.reload}>
        {res.error.message}
      </StateMessage>
    )
  }
  if (res.status === 'ready' && res.data.length === 0) {
    return (
      <StateMessage title={`No featured picks found for “${q}”.`}>
        <p>Try a different search or search type.</p>
        <Link to="/featured" className="btn btn-secondary state-message-action">
          See all featured picks
        </Link>
      </StateMessage>
    )
  }
  return (
    <>
      {res.status === 'ready' && (
        <p className="browse-count muted" aria-live="polite">
          {res.data.length} {res.data.length === 1 ? 'book' : 'books'} found · searching by featured
        </p>
      )}
      <ul className="book-grid" role="list" aria-label={`Results for ${q}`} aria-busy={res.status === 'loading'}>
        {res.status === 'loading'
          ? Array.from({ length: 6 }, (_, i) => (
              <li key={i}>
                <BookCardSkeleton />
              </li>
            ))
          : res.data.map((book) => (
              <li key={book.id} className="featured-item">
                <BookCard book={book} />
                <span className="featured-month">{formatMonth(book.month)}</span>
              </li>
            ))}
      </ul>
    </>
  )
}

export default function SearchPage() {
  const [params] = useSearchParams()
  const { mode } = useTheme()
  const q = (params.get('q') ?? '').trim()
  const type = normalizeType(params.get('type'))
  const kids = mode === 'kid-korner'
  const queryKey = `${q}|${type}|${kids}`

  return (
    <div className="browse container">
      <title>{q ? `Results for “${q}” · BookWorm` : 'Search · BookWorm'}</title>
      <SearchBar key={params.toString()} className="search-lg" />
      <h1 className="browse-title">{q ? `Results for “${q}”` : 'Search books'}</h1>
      {type === 'featured' ? (
        <FeaturedResults key={queryKey} q={q} kids={kids} />
      ) : (
        <SearchResults key={queryKey} q={q} type={type} kids={kids} />
      )}
    </div>
  )
}
