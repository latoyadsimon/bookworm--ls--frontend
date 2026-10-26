import { Link } from 'react-router'
import CoverArt from './CoverArt'
import { formatAuthors } from '../lib/format'
import './books.css'

// The one book card used on every page. The whole card is a single link.
export default function BookCard({ book }) {
  const authors = formatAuthors(book.authors)
  return (
    <Link to={`/books/${book.id}`} className="book-card">
      <CoverArt book={book} decorative />
      <span className="book-card-title">{book.title}</span>
      {/* Read aloud as "Title by Author" while matching the visible text */}
      <span className="visually-hidden"> by </span>
      <span className="book-card-author">{authors}</span>
    </Link>
  )
}

export function BookCardSkeleton() {
  return (
    <div className="book-card is-skeleton" aria-hidden="true">
      <div className="cover skeleton-block" />
      <span className="skeleton-line" />
      <span className="skeleton-line is-short" />
    </div>
  )
}
