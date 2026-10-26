import { useId, useRef } from 'react'
import BookCard, { BookCardSkeleton } from './BookCard'
import StateMessage from './StateMessage'
import Icon from './Icon'
import { useBookList } from '../hooks/useBookList'

const ROW_PAGE_SIZE = 10

// Netflix-style horizontal row. Ends with a "Load More ›" card that appends the next batch.
export default function BookRow({ title, params }) {
  const list = useBookList({ ...params, pageSize: ROW_PAGE_SIZE })
  const scrollerRef = useRef(null)
  const headingId = useId()

  function scrollBy(direction) {
    const el = scrollerRef.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <section className="book-row" aria-labelledby={headingId}>
      <div className="book-row-head container">
        <h2 id={headingId} className="drip">
          {title}
        </h2>
        {list.status === 'ready' && list.items.length > 0 && (
          <div className="book-row-arrows">
            <button type="button" className="icon-btn" aria-label={`Scroll ${title} left`} onClick={() => scrollBy(-1)}>
              <Icon name="chevronDown" className="rot-left" />
            </button>
            <button type="button" className="icon-btn" aria-label={`Scroll ${title} right`} onClick={() => scrollBy(1)}>
              <Icon name="chevronDown" className="rot-right" />
            </button>
          </div>
        )}
      </div>

      {list.status === 'error' ? (
        <div className="container">
          <StateMessage tone="error" title="We couldn't load these books right now." onRetry={list.retry} compact>
            {list.error.message}
          </StateMessage>
        </div>
      ) : (
        <ul className="book-row-scroller" ref={scrollerRef} role="list" aria-busy={list.status === 'loading'}>
          {list.status === 'loading'
            ? Array.from({ length: 7 }, (_, i) => (
                <li key={i}>
                  <BookCardSkeleton />
                </li>
              ))
            : list.items.map((book) => (
                <li key={book.id}>
                  <BookCard book={book} />
                </li>
              ))}

          {list.status === 'ready' && list.items.length === 0 && (
            <li className="book-row-empty">
              <StateMessage title="No books here yet." compact />
            </li>
          )}

          {list.status === 'ready' && list.loadingMore &&
            Array.from({ length: 3 }, (_, i) => (
              <li key={`more-${i}`}>
                <BookCardSkeleton />
              </li>
            ))}

          {list.status === 'ready' && !list.loadingMore && list.nextPage != null && (
            <li>
              <button type="button" className="load-more-card" onClick={list.loadMore}>
                {list.moreError ? (
                  <>
                    <Icon name="refresh" size={26} />
                    <span>Couldn't load more. Retry</span>
                  </>
                ) : (
                  <>
                    <span className="load-more-card-label">Load More</span>
                    <Icon name="chevronDown" size={26} className="rot-right" />
                  </>
                )}
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
