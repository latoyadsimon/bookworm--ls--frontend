import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { featuredLabel, getCurrentFeatured, listFeatured, searchFeatured, toFeatured } from '../../src/services/featuredApi'
import { formatMonth } from '../../src/lib/format'
import { calls, invoke, queueResult, resetMock, stepsOf } from './supabaseMock'
import { run } from './helpers'

vi.mock('../../src/lib/supabase.js', async () => (await import('./supabaseMock.js')).mockModule)

beforeEach(() => {
  resetMock()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

const row = (month, title, extra = {}) => ({
  month,
  volume_id: `id-${month}`,
  title,
  authors: ['A. Writer'],
  thumbnail_url: null,
  description: '<p>Hi &amp; bye</p>',
  maturity_rating: 'NOT_MATURE',
  nyt_list: null,
  nyt_rank: null,
  ...extra,
})

describe('labels and months', () => {
  it('labels NYT picks with rank and list, and a null list as Starter pick', () => {
    expect(featuredLabel('hardcover-fiction', 1)).toBe('#1 NYT Hardcover Fiction')
    expect(featuredLabel('combined-print-and-e-book-nonfiction', 3)).toBe('#3 NYT Combined Nonfiction')
    expect(featuredLabel(null, null)).toBe('Starter pick')
  })

  it('formats the month in UTC', () => {
    expect(formatMonth('2026-10-01')).toBe('October 2026')
    expect(formatMonth('2027-01-01')).toBe('January 2027')
    expect(formatMonth(null)).toBe('')
  })

  it('maps a row to the card shape', () => {
    expect(toFeatured(row('2026-10-01', 'T'))).toMatchObject({
      id: 'id-2026-10-01',
      title: 'T',
      thumbnail: null,
      description: 'Hi & bye',
      label: 'Starter pick',
      stale: false,
    })
  })
})

describe('getCurrentFeatured', () => {
  it('calls the featured function with an empty body and passes the stale flag through', async () => {
    invoke.mockResolvedValue({ data: { ...row('2026-10-01', 'T'), stale: true }, error: null })
    const book = await run(getCurrentFeatured({}))
    expect(invoke).toHaveBeenCalledWith('featured', { body: {}, signal: undefined, region: 'us-east-2' })
    expect(book).toMatchObject({ title: 'T', stale: true })
  })

  it('maps a 503 to a BooksApiError', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { name: 'FunctionsHttpError', context: { status: 503, json: async () => ({ error: 'No featured pick yet.' }) } },
    })
    await expect(run(getCurrentFeatured({}))).rejects.toMatchObject({ status: 503, message: 'No featured pick yet.' })
  })

  it('keeps a MATURE pick for everyone but Kid Korner', async () => {
    invoke.mockResolvedValue({ data: { ...row('2026-11-01', 'Dark'), maturity_rating: 'MATURE' }, error: null })
    expect((await run(getCurrentFeatured({ kids: false }))).title).toBe('Dark')
  })

  it('Kid Korner swaps a MATURE pick for the newest NOT_MATURE one', async () => {
    invoke.mockResolvedValue({ data: { ...row('2026-11-01', 'Dark'), maturity_rating: 'MATURE' }, error: null })
    queueResult({
      data: [{ ...row('2026-11-01', 'Dark'), maturity_rating: 'MATURE' }, row('2026-10-01', 'Gentle'), row('2026-09-01', 'Older')],
      error: null,
    })
    expect((await run(getCurrentFeatured({ kids: true }))).title).toBe('Gentle')
  })

  it('Kid Korner gets null when no pick is suitable', async () => {
    invoke.mockResolvedValue({ data: { ...row('2026-11-01', 'Dark'), maturity_rating: 'MATURE' }, error: null })
    queueResult({ data: [{ ...row('2026-11-01', 'Dark'), maturity_rating: 'MATURE' }], error: null })
    expect(await run(getCurrentFeatured({ kids: true }))).toBeNull()
  })
})

describe('listFeatured and searchFeatured', () => {
  it('reads the table newest first', async () => {
    queueResult({ data: [row('2026-10-01', 'T')], error: null })
    const list = await run(listFeatured())
    expect(list).toHaveLength(1)
    expect(calls[0].table).toBe('featured_books')
    expect(stepsOf(calls[0])).toEqual(['select(*)', 'order(month,{"ascending":false})'])
  })

  it('maps a read failure to a 502', async () => {
    queueResult({ data: null, error: { message: 'x' } })
    await expect(run(listFeatured())).rejects.toMatchObject({ status: 502 })
  })

  it('filters by title or author, ignoring case, and returns all for an empty query', async () => {
    const data = [row('2026-10-01', 'The Pragmatic Programmer'), row('2026-09-01', 'Dune', { authors: ['Frank Herbert'] })]
    queueResult({ data, error: null })
    expect((await run(searchFeatured('PRAGMATIC'))).map((b) => b.title)).toEqual(['The Pragmatic Programmer'])
    queueResult({ data, error: null })
    expect((await run(searchFeatured('herbert'))).map((b) => b.title)).toEqual(['Dune'])
    queueResult({ data, error: null })
    expect(await run(searchFeatured('  '))).toHaveLength(2)
    queueResult({ data, error: null })
    expect(await run(searchFeatured('nothing'))).toEqual([])
  })
})
