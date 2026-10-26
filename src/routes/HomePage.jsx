import FeaturedHero from '../components/FeaturedHero'
import BookRow from '../components/BookRow'
import { useTheme } from '../context/theme-context'

const ROWS = [
  { topic: 'programming', title: 'Programming' },
  { topic: 'ai', title: 'Artificial Intelligence' },
  { topic: 'computers', title: 'Computers & Technology' },
]

export default function HomePage() {
  const { mode } = useTheme()
  const kids = mode === 'kid-korner'

  return (
    <>
      <title>BookWorm · Discover technology books</title>
      <h1 className="visually-hidden">Discover technology books</h1>
      <FeaturedHero key={`hero-${kids}`} kids={kids} />
      {ROWS.map((row) => (
        <BookRow
          key={`${row.topic}-${kids}`}
          title={row.title}
          params={{ source: 'topic', topic: row.topic, kids }}
        />
      ))}
    </>
  )
}
