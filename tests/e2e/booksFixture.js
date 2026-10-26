// A deterministic stand-in for the `books` Edge Function, served through
// page.route so browser tests never depend on Google Books (or its quota).
// It follows the contract: same request bodies, same Book shape, same paging.

export const FEATURED = {
  id: 'LhOlDwAAQBAJ',
  title: 'The Pragmatic Programmer',
  description: '<p>Your journey to <b>mastery</b> &amp; beyond.</p><p>Second paragraph.</p>',
}

// Covers must be https (the database enforces it), so they point at a fake host that mockBooks answers
const cover = (title, hue) =>
  `https://covers.fixture.test/${hue}/${encodeURIComponent(title.slice(0, 14))}.svg`
const coverSvg = (hue, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="hsl(${hue} 45% 28%)"/><text x="100" y="150" fill="white" font-size="18" text-anchor="middle">${title}</text></svg>`

let n = 0
function make(title, { topics = [], genres = [], mature = false, id, description } = {}) {
  n += 1
  const digits = String(9780000000000 + n * 7)
  return {
    id: id ?? `fx${String(n).padStart(4, '0')}`,
    title,
    authors: [`Author ${n % 9}`],
    description: description ?? (n % 7 === 0 ? null : `${title} is a fixture book number ${n}.`),
    thumbnail: n % 11 === 0 ? null : cover(title, (n * 37) % 360),
    publisher: 'Fixture Press',
    publishedDate: `${2000 + (n % 25)}-05-01`,
    pageCount: 100 + n,
    categories: ['Fixture'],
    averageRating: n % 3 === 0 ? null : 4,
    ratingsCount: n % 3 === 0 ? null : n,
    isbn10: null,
    isbn13: digits,
    maturityRating: mature ? 'MATURE' : 'NOT_MATURE',
    _topics: topics,
    _genres: genres,
  }
}

export const CATALOG = [
  make(FEATURED.title, { id: FEATURED.id, topics: ['programming'], genres: ['technology'], description: FEATURED.description }),
  make('The Clean Code Handbook', { id: 'hjEFCAAAQBAJ', topics: ['programming'], genres: ['technology'] }),
  make('The Mind Machines', { id: 'uOUIwQEACAAJ', topics: ['ai'], genres: ['technology'] }),
  make('The Code Book', { id: 'gYlQAAAAMAAJ', topics: ['computers'], genres: ['technology'] }),
  make('The Haunting Hall', { id: 'pOhhAwAAQBAJ', genres: ['horror'], mature: true }),
]
for (const [slug, topics, genres] of [
  ['Programming', ['programming'], ['technology']],
  ['Neural', ['ai'], ['technology']],
  ['Computers', ['computers'], ['technology']],
  ['Adventure', [], ['adventure']],
  ['Horror', [], ['horror']],
  ['Starship', [], ['sci-fi']],
  ['Novel', [], ['fiction']],
  ['Essay', [], ['non-fiction']],
]) {
  for (let i = 1; i <= 52; i++) {
    CATALOG.push(make(`The ${slug} Volume ${i}`, { topics, genres, mature: slug === 'Horror' && i % 3 === 0 }))
  }
}

const strip = ({ _topics, _genres, ...book }) => book // eslint-disable-line no-unused-vars
const json = (status, body) => ({
  status,
  contentType: 'application/json',
  headers: { 'access-control-allow-origin': '*' },
  body: JSON.stringify(body),
})

function answer(req) {
  if (req.id) {
    const book = CATALOG.find((b) => b.id === req.id)
    return book ? json(200, strip(book)) : json(404, { error: 'Book not found.' })
  }
  const { source, topic, q = '', type = 'all', genre, page = 0, pageSize = 20, kids = false } = req
  const query = String(q).trim().toLowerCase()
  let filter
  if (source === 'topic') filter = (b) => b._topics.includes(topic)
  else if (source === 'genre') filter = (b) => b._genres.includes(genre)
  else if (type === 'title') filter = (b) => b.title.toLowerCase().includes(query)
  else if (type === 'author') filter = (b) => b.authors.some((a) => a.toLowerCase().includes(query))
  else if (type === 'isbn') filter = (b) => b.isbn13 === query.replace(/[\s-]/g, '')
  else filter = (b) => [b.title, ...b.authors, b.description ?? ''].join(' ').toLowerCase().includes(query)
  const all = CATALOG.filter((b) => filter(b) && (!kids || b.maturityRating !== 'MATURE'))
  const start = page * pageSize
  const items = all.slice(start, start + pageSize).map(strip)
  const end = start + pageSize
  const nextPage = end < all.length && end <= 200 && items.length === pageSize ? page + 1 : null
  return json(200, { items, page, nextPage, totalItems: all.length })
}

/** Routes every call to the books function to the fixture catalog. */
export async function mockBooks(page) {
  await page.route('https://covers.fixture.test/**', (route) => {
    const [hue, name] = new URL(route.request().url()).pathname.slice(1).replace(/\.svg$/, '').split('/')
    return route.fulfill({ contentType: 'image/svg+xml', body: coverSvg(hue, decodeURIComponent(name)) })
  })
  await page.route('**/functions/v1/books*', (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
          'access-control-allow-methods': 'POST, OPTIONS',
        },
      })
    }
    return route.fulfill(answer(request.postDataJSON() ?? {}))
  })
}

// ---- featured_books: the `featured` function and the public table, mocked the same way ----

const row = (month, title, extra = {}) => ({
  month,
  volume_id: extra.volume_id ?? `ft${month.slice(0, 7).replace('-', '')}`,
  title,
  authors: ['Fixture Author'],
  thumbnail_url: extra.thumbnail_url === undefined ? cover(title, 200) : extra.thumbnail_url,
  description: extra.description ?? `${title} is the pick for ${month.slice(0, 7)}.`,
  maturity_rating: 'NOT_MATURE',
  nyt_list: null,
  nyt_rank: null,
  ...extra,
})

const thisMonth = `${new Date().toISOString().slice(0, 7)}-01`

/** Newest first, like the table. The current month's pick is the first row. */
export const FEATURED_ROWS = [
  row(thisMonth, FEATURED.title, { volume_id: FEATURED.id, description: FEATURED.description }),
  row('2026-09-01', 'The Fixture Chronicle', { nyt_list: 'hardcover-fiction', nyt_rank: 1 }),
  row('2026-08-01', 'Atlas of Fixtures', { nyt_list: 'combined-print-and-e-book-nonfiction', nyt_rank: 1 }),
]

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
}

/**
 * Routes the `featured` function and the featured_books table to fixtures.
 * `rows` is the history (newest first); `current` is what the function returns
 * (defaults to rows[0]); `status` makes the function fail instead.
 */
export async function mockFeatured(page, { rows = FEATURED_ROWS, current = rows[0], status } = {}) {
  await page.route('**/functions/v1/featured*', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cors })
    if (status) return route.fulfill({ ...json(status, { error: 'No featured pick yet.' }) })
    return route.fulfill(json(200, { ...current, stale: false }))
  })
  await page.route('**/rest/v1/featured_books**', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cors })
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows) })
  })
}
