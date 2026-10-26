// QA audit: boundaries and failure paths in booksApi, featuredApi and the db adapter.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BooksApiError, MAX_START_INDEX, getBook, getBooks } from '../../src/services/booksApi'
import { getCurrentFeatured, searchFeatured } from '../../src/services/featuredApi'
import * as db from '../../src/services/db'
import { calls, invoke, queueResult, resetMock, stepsOf, supabase } from './supabaseMock'
import { run } from './helpers'

vi.mock('../../src/lib/supabase.js', async () => (await import('./supabaseMock.js')).mockModule)

const ME = '00000000-0000-4000-a000-000000000003' // a seed reader: goes through supabase-js
const OTHER = '00000000-0000-4000-a000-000000000002'
const page = (items = []) => ({ data: { items, page: 0, nextPage: null, totalItems: items.length }, error: null })
const httpError = (status, json) => ({ data: null, error: { name: 'FunctionsHttpError', context: { status, json } } })

beforeEach(() => {
  resetMock()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('getBooks paging boundaries', () => {
  it.each([
    [10, 20], // 200: the last allowed start index
    [5, 40],
    [200, 1],
    [0, 40],
  ])('page %i x pageSize %i (start index <= 200) reaches the network', async (p, size) => {
    invoke.mockResolvedValue(page())
    await run(getBooks({ source: 'genre', genre: 'horror', page: p, pageSize: size }))
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke.mock.calls[0][1].body).toMatchObject({ page: p, pageSize: size })
  })

  it.each([
    [201, 1], // 201
    [7, 30], // 210
    [1.5, 20], // non-integer page
    [-1, 20],
    [NaN, 20],
    ['1', 20], // string page from a URL
    [0, 0],
    [0, 2.5],
    [0, Infinity],
  ])('page %o x pageSize %o is rejected before the network', async (p, size) => {
    await expect(run(getBooks({ source: 'genre', genre: 'horror', page: p, pageSize: size }))).rejects.toMatchObject({
      status: 400,
      message: 'Invalid page.',
    })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('exports the same 200 cap the Edge Function uses', () => expect(MAX_START_INDEX).toBe(200))

  it('defaults nextPage to null when the function omits it', async () => {
    invoke.mockResolvedValue({ data: { items: [], page: 0, totalItems: 0 }, error: null })
    expect((await run(getBooks({ source: 'topic', topic: 'ai' }))).nextPage).toBeNull()
  })

  it('sends the trimmed query and the normalized type for tampered input', async () => {
    invoke.mockResolvedValue(page())
    await run(getBooks({ source: 'search', q: '\t c++ (2nd ed.) ', type: '__proto__' }))
    expect(invoke.mock.calls[0][1].body).toMatchObject({ q: 'c++ (2nd ed.)', type: 'all' })
  })
})

describe('callFunction error mapping', () => {
  it('uses the default message when the error body is JSON without an error field', async () => {
    invoke.mockResolvedValue(httpError(504, async () => ({ message: 'upstream' })))
    await expect(run(getBook('abc'))).rejects.toMatchObject({ status: 504, message: 'The book service took too long to respond.' })
  })

  it('maps an unknown status with a non-JSON body to the 502 message, keeping the status', async () => {
    invoke.mockResolvedValue(httpError(418, async () => {
      throw new SyntaxError('Unexpected token <')
    }))
    const err = await run(getBook('abc')).catch((e) => e)
    expect(err).toBeInstanceOf(BooksApiError)
    expect(err).toMatchObject({ status: 418, message: 'The book service is having trouble.' })
  })

  it('maps a relay error with no HTTP response to 502', async () => {
    invoke.mockResolvedValue({ data: null, error: { name: 'FunctionsRelayError', context: {} } })
    await expect(run(getBook('abc'))).rejects.toMatchObject({ status: 502 })
  })

  it('maps an abort reported through error.context to AbortError', async () => {
    invoke.mockResolvedValue({ data: null, error: { name: 'FunctionsFetchError', context: { name: 'AbortError' } } })
    await expect(run(getBook('abc'))).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('maps an abort that happens during the call to AbortError, not 502', async () => {
    const controller = new AbortController()
    invoke.mockImplementation(async () => {
      controller.abort()
      throw new TypeError('fetch failed')
    })
    await expect(run(getBook('abc', { signal: controller.signal }))).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('an abort during ?simulate=slow rejects with AbortError and never calls the function', async () => {
    vi.stubGlobal('window', { location: { search: '?simulate=slow' } })
    const controller = new AbortController()
    const p = getBook('abc', { signal: controller.signal })
    const settled = p.catch((e) => e)
    await vi.advanceTimersByTimeAsync(500)
    controller.abort()
    const err = await settled
    expect(err.name).toBe('AbortError')
    expect(invoke).not.toHaveBeenCalled()
  })

  // Regression (QA bug fixed 2026-10-26): booksApi.js `wait()` only listens for a future 'abort' event; a signal that
  // is already aborted is ignored, so ?simulate=timeout still waits 1.8 s and then throws a
  // BooksApiError(504) instead of an AbortError (hooks treat that as a real failure).
  it('a signal aborted before the call rejects with AbortError even under ?simulate=timeout', async () => {
    vi.stubGlobal('window', { location: { search: '?simulate=timeout' } })
    const controller = new AbortController()
    controller.abort()
    await expect(run(getBook('abc', { signal: controller.signal }))).rejects.toMatchObject({ name: 'AbortError' })
  })

  // Regression (QA bug fixed 2026-10-26): a 200 response whose body is not the expected JSON (e.g. a proxy/captive-portal
  // HTML page, which supabase-js returns as a string, or null) makes getBooks throw a raw
  // TypeError ("Cannot read properties of undefined (reading 'map')"). BookGrid/BookRow
  // then print that internal message to the user instead of a BooksApiError(502).
  it('a 200 response without an items array becomes a BooksApiError, not a TypeError', async () => {
    invoke.mockResolvedValue({ data: '<html>Login to Wi-Fi</html>', error: null })
    await expect(run(getBooks({ source: 'topic', topic: 'ai' }))).rejects.toBeInstanceOf(BooksApiError)
  })
})

describe('getBook id validation', () => {
  it.each(['a'.repeat(64), 'A-b_9'])('accepts %j', async (id) => {
    invoke.mockResolvedValue({ data: { id, title: 'T' }, error: null })
    await run(getBook(id))
    expect(invoke).toHaveBeenCalled()
  })
  it.each(['', '../etc', 'a b', 'ünï', 'a'.repeat(65), 'id?x=1', null, undefined])('rejects %j before the network', async (id) => {
    await expect(run(getBook(id))).rejects.toMatchObject({ status: 400, message: 'Invalid book ID.' })
    expect(invoke).not.toHaveBeenCalled()
  })
})

const row = (month, title, extra = {}) => ({
  month,
  volume_id: `id-${month}`,
  title,
  authors: ['A. Writer'],
  thumbnail_url: null,
  description: null,
  maturity_rating: 'NOT_MATURE',
  nyt_list: null,
  nyt_rank: null,
  ...extra,
})

describe('featuredApi edge cases', () => {
  it('Kid Korner gets null when every pick, current and past, is MATURE', async () => {
    invoke.mockResolvedValue({ data: row('2026-10-01', 'Now', { maturity_rating: 'MATURE' }), error: null })
    queueResult({
      data: [row('2026-10-01', 'Now', { maturity_rating: 'MATURE' }), row('2026-09-01', 'Old', { maturity_rating: 'MATURE' })],
      error: null,
    })
    expect(await run(getCurrentFeatured({ kids: true }))).toBeNull()
  })

  it('Kid Korner falls back to the newest suitable pick, skipping older ones', async () => {
    invoke.mockResolvedValue({ data: row('2026-10-01', 'Now', { maturity_rating: 'MATURE' }), error: null })
    queueResult({
      data: [
        row('2026-10-01', 'Now', { maturity_rating: 'MATURE' }),
        row('2026-09-01', 'Sept'),
        row('2026-08-01', 'Aug'),
      ],
      error: null,
    })
    expect((await run(getCurrentFeatured({ kids: true }))).title).toBe('Sept')
  })

  it('a missing maturity rating counts as NOT_MATURE (no needless fallback query)', async () => {
    invoke.mockResolvedValue({ data: row('2026-10-01', 'Now', { maturity_rating: null }), error: null })
    expect((await run(getCurrentFeatured({ kids: true }))).title).toBe('Now')
    expect(calls).toHaveLength(0)
  })

  it.each(['(', '.*', '[a-z', '\\', '$^', '?', '+'])('search treats %j literally (no regex)', async (q) => {
    queueResult({ data: [row('2026-10-01', 'C++ (2nd ed.) .* [a-z \\ $^ ?')], error: null })
    const out = await run(searchFeatured(q))
    expect(out).toHaveLength(1)
  })

  it('search matches authors case-insensitively and ignores surrounding spaces', async () => {
    queueResult({ data: [row('2026-10-01', 'X', { authors: ['Ursula K. Le Guin'] }), row('2026-09-01', 'Y')], error: null })
    expect((await run(searchFeatured('  le guin '))).map((b) => b.title)).toEqual(['X'])
  })

  it('search survives a pick with no authors', async () => {
    queueResult({ data: [row('2026-10-01', 'Lonely', { authors: null })], error: null })
    expect(await run(searchFeatured('lonely'))).toHaveLength(1)
  })
})

describe('db adapter: scoping and errors', () => {
  const last = () => calls.at(-1)

  it('every private read, update and delete is scoped to the signed-in reader; inserts never send user_id', async () => {
    await db.getLibraryItem(ME, 'v')
    await db.listLibrary(ME)
    await db.updateLibraryStatus(ME, 'i', 'reading')
    await db.removeFromLibrary(ME, 'i')
    await db.countLogsForItem(ME, 'i')
    await db.updateLog(ME, 'l', { body: 'x' })
    await db.deleteLog(ME, 'l')
    for (const c of calls) expect(stepsOf(c)).toContain(`eq(user_id,${ME})`)
    await db.addToLibrary(ME, { volume_id: 'v', title: 't' })
    expect(last().steps[0][1][0]).not.toHaveProperty('user_id')
    await db.addLog(ME, { library_item_id: 'i', volume_id: 'v', body: 'b' })
    expect(last().steps[0][1][0]).not.toHaveProperty('user_id')
  })

  it('updateProfile never sends a query for another reader’s row', async () => {
    const res = await run(db.updateProfile(ME, OTHER, { theme: 'neon-arcade', display_name: 'Hacked' }))
    expect(res).toEqual({ data: null, error: null })
    expect(calls).toHaveLength(0)
  })

  it('updateProfile sends only display_name and theme, never other columns', async () => {
    await db.updateProfile(ME, ME, { theme: 'neon-arcade', id: OTHER, created_at: 'x' })
    expect(stepsOf(last())[0]).toBe('update({"theme":"neon-arcade"})')
  })

  it('maps a thrown client error to NETWORK', async () => {
    supabase.from.mockImplementationOnce(() => {
      throw new TypeError('Failed to fetch')
    })
    expect(await db.listLibrary(ME)).toEqual({ data: null, error: { message: 'The database is not responding.', code: 'NETWORK' } })
  })

  it('trims log bodies before saving, and stores a missing rating as null', async () => {
    await db.addLog(ME, { library_item_id: 'i', volume_id: 'v', body: '  hello  ', rating: undefined })
    expect(last().steps[0][1][0]).toMatchObject({ body: 'hello', rating: null })
    await db.updateLog(ME, 'l', { body: '\n edited \n' })
    expect(stepsOf(last())[0]).toBe('update({"body":"edited","rating":null})')
  })

  it.each([
    ['50%', '50\\%'],
    ['a_b', 'a\\_b'],
    ['back\\slash', 'back\\\\slash'],
    ['  Plain  ', 'Plain'],
  ])('isDisplayNameTaken escapes LIKE wildcards: %j -> %j', async (name, pattern) => {
    await db.isDisplayNameTaken(name)
    expect(last().steps.find(([m]) => m === 'ilike')[1]).toEqual(['display_name', pattern])
  })

  // Regression (QA bug fixed 2026-10-26): PostgREST treats `*` as an alias for `%` in like/ilike filters, and
  // escapeLike (db.js:36) does not escape it. Verified against the live project:
  // `display_name=ilike.Book*` returns BookLover42. So signing up as "Book*" (or
  // "Q*") is wrongly refused with "That display name is taken."
  it('isDisplayNameTaken escapes PostgREST’s * wildcard too', async () => {
    await db.isDisplayNameTaken('Book*')
    const [, pattern] = last().steps.find(([m]) => m === 'ilike')[1]
    expect(pattern).not.toMatch(/(^|[^\\])\*/)
  })

  it('isDisplayNameTaken is true only when a row comes back', async () => {
    queueResult({ data: [{ id: ME }], error: null })
    expect(await db.isDisplayNameTaken('quietreader')).toBe(true)
    queueResult({ data: [], error: null })
    expect(await db.isDisplayNameTaken('nobody-has-this')).toBe(false)
  })

  it('listLogsForVolume asks the database for newest first and reports errors', async () => {
    queueResult({ data: [{ id: 'a' }, { id: 'b' }], error: null })
    const res = await run(db.listLogsForVolume('v'))
    expect(res.data.map((l) => l.id)).toEqual(['a', 'b'])
    expect(stepsOf(last())).toContain('order(created_at,{"ascending":false})')
    queueResult({ data: null, error: { message: 'boom' } })
    expect((await run(db.listLogsForVolume('v'))).error.code).toBe('NETWORK')
  })

  it('a 0-row update (item gone or not mine) comes back as data null, not as success data', async () => {
    queueResult({ data: null, error: null })
    expect(await db.updateLibraryStatus(ME, 'missing', 'finished')).toEqual({ data: null, error: null })
  })

  it('getProfile turns a missing row into PGRST116', async () => {
    queueResult({ data: null, error: null })
    expect((await db.getProfile(ME)).error.code).toBe('PGRST116')
  })
})
