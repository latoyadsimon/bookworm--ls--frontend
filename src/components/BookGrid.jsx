import BookCard, { BookCardSkeleton } from './BookCard'
import StateMessage from './StateMessage'

// Responsive grid of books with a Load More button (Search + Genre pages).
// `list` comes from useBookList; `empty` renders when there are no results.
export default function BookGrid({ list, empty, label }) {
  if (list.status === 'error') {
    const isValidation = list.error.status === 400
    return (
      <StateMessage
        tone="error"
        title={isValidation ? list.error.message : "We couldn't load these books right now."}
        onRetry={isValidation ? undefined : list.retry}
      >
        {!isValidation && list.error.message}
      </StateMessage>
    )
  }

  if (list.status === 'ready' && list.items.length === 0) return empty

  return (
    <>
      <ul className="book-grid" role="list" aria-label={label} aria-busy={list.status === 'loading' || list.loadingMore}>
        {list.status === 'loading'
          ? Array.from({ length: 12 }, (_, i) => (
              <li key={i}>
                <BookCardSkeleton />
              </li>
            ))
          : list.items.map((book) => (
              <li key={book.id}>
                <BookCard book={book} />
              </li>
            ))}
        {list.loadingMore &&
          Array.from({ length: 6 }, (_, i) => (
            <li key={`more-${i}`}>
              <BookCardSkeleton />
            </li>
          ))}
      </ul>

      {list.status === 'ready' && (
        <div className="grid-footer">
          {list.moreError && (
            <StateMessage tone="error" title="Couldn't load more books." onRetry={list.loadMore} compact>
              {list.moreError.message} The books above are still here.
            </StateMessage>
          )}
          {list.nextPage != null && !list.moreError && (
            <button type="button" className="btn btn-secondary load-more-btn" onClick={list.loadMore} disabled={list.loadingMore}>
              {list.loadingMore ? 'Loading…' : 'Load More'}
            </button>
          )}
          {list.nextPage == null && <p className="grid-end muted">You've reached the end.</p>}
        </div>
      )}
    </>
  )
}
