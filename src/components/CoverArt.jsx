import { useState } from 'react'
import Icon from './Icon'

// Book cover with a consistent per-mode placeholder when the cover is missing
// or fails to load. Pass `decorative` when nearby text already names the book.
export default function CoverArt({ book, decorative = false, eager = false, className = '' }) {
  const [failed, setFailed] = useState(false)
  const showImage = book.thumbnail && !failed

  return (
    <div className={`cover ${className}`}>
      {showImage ? (
        <img
          src={book.thumbnail}
          alt={decorative ? '' : `Cover of ${book.title}`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="cover-placeholder"
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : `No cover available for ${book.title}`}
          aria-hidden={decorative || undefined}
        >
          <Icon name="book" size={28} />
          <span className="cover-placeholder-title">{book.title}</span>
        </div>
      )}
    </div>
  )
}
