import { NavLink, useParams } from 'react-router'
import BookGrid from '../components/BookGrid'
import StateMessage from '../components/StateMessage'
import { useBookList } from '../hooks/useBookList'
import { useTheme } from '../context/theme-context'
import { GENRES, findGenre } from '../data/genres'
import './browse.css'

function GenreChips({ label = 'Genres' }) {
  return (
    <nav aria-label={label}>
      <ul className="chips" role="list">
        {GENRES.map((g) => (
          <li key={g.slug}>
            <NavLink to={`/genre/${g.slug}`} className="chip">
              {g.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function GenreResults({ genre, kids }) {
  const list = useBookList({ source: 'genre', genre: genre.slug, kids, pageSize: 20 })
  return (
    <>
      {list.status === 'ready' && list.items.length > 0 && (
        <p className="browse-count muted">
          {list.total} {genre.label} {list.total === 1 ? 'book' : 'books'}
        </p>
      )}
      <BookGrid
        list={list}
        label={`${genre.label} books`}
        empty={<StateMessage title="No books found in this genre." />}
      />
    </>
  )
}

export default function GenrePage() {
  const { genre: slug } = useParams()
  const { mode } = useTheme()
  const genre = findGenre(slug)
  const kids = mode === 'kid-korner'

  if (!genre) {
    return (
      <div className="browse container">
        <title>Genre not found · BookWorm</title>
        <h1 className="browse-title">Genre not found</h1>
        <StateMessage title={`We don't have a “${slug}” genre.`}>
          <p>Try one of these:</p>
        </StateMessage>
        <GenreChips label="Available genres" />
      </div>
    )
  }

  return (
    <div className="browse container">
      <title>{`${genre.label} books · BookWorm`}</title>
      <GenreChips />
      <h1 className="browse-title drip">{genre.label}</h1>
      <GenreResults key={`${genre.slug}-${kids}`} genre={genre} kids={kids} />
    </div>
  )
}
