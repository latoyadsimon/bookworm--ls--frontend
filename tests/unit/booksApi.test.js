import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BooksApiError, cleanText, getBook, getBooks } from '../../src/services/booksApi'
import { invoke, resetMock } from './supabaseMock'
import { run } from './helpers'

vi.mock('../../src/lib/supabase.js', async () => (await import('./supabaseMock.js')).mockModule)

// booksApi validates first (no network), then calls the `books` Edge Function.
beforeEach(() => {
  resetMock()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

const httpError = (status, body) => ({
  data: null,
  error: { name: 'FunctionsHttpError', context: { status, json: async () => body } },
})

describe('getBooks validation (before any network call)', () => {
  it.each([
    [{ source: 'search', q: '', type: 'all' }, 'Please enter a search term.'],
    [{ source: 'search', q: 'a'.repeat(201), type: 'all' }, 'Search is too long (max 200 characters).'],
    [{ source: 'search', q: '12345', type: 'isbn' }, 'ISBN must be 10 or 13 digits.'],
    [{ source: 'genre', genre: 'cooking' }, 'Unknown genre.'],
    [{ source: 'topic', topic: 'cats' }, 'Unknown topic.'],
    [{ source: 'everything' }, 'Unknown request.'],
    [{ source: 'genre', genre: 'horror', page: 11, pageSize: 20 }, 'Invalid page.'],
    [{ source: 'genre', genre: 'horror', pageSize: 41 }, 'Invalid page.'],
  ])('rejects %o with 400 and never calls the network', async (params, message) => {
    await expect(run(getBooks(params))).rejects.toMatchObject({ status: 400, message })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('rejects a bad book id without calling the network', async () => {
    await expect(run(getBook('x'.repeat(65)))).rejects.toMatchObject({ status: 400, message: 'Invalid book ID.' })
    await expect(run(getBook('bad id!'))).rejects.toMatchObject({ status: 400 })
    expect(invoke).not.toHaveBeenCalled()
  })
})

describe('getBooks requests and results', () => {
  it('sends the list request body and returns the shaped page', async () => {
    invoke.mockResolvedValue({
      data: { items: [{ id: 'a', title: 'A', description: '<p>Hi &amp; <b>bye</b></p>' }], page: 0, nextPage: 1, totalItems: 50 },
      error: null,
    })
    const res = await run(getBooks({ source: 'search', q: '  dune ', type: 'bogus', kids: true, pageSize: 10 }))
    expect(invoke).toHaveBeenCalledWith('books', {
      body: { source: 'search', q: 'dune', type: 'all', page: 0, pageSize: 10, kids: true },
      signal: undefined,
      region: 'us-east-2',
    })
    expect(res).toMatchObject({ page: 0, nextPage: 1, totalItems: 50 })
    expect(res.items[0].description).toBe('Hi & bye')
  })

  it('requests one book by id', async () => {
    invoke.mockResolvedValue({ data: { id: 'LhOlDwAAQBAJ', title: 'T', description: null }, error: null })
    expect((await run(getBook('LhOlDwAAQBAJ'))).title).toBe('T')
    expect(invoke.mock.calls[0][1].body).toEqual({ id: 'LhOlDwAAQBAJ' })
  })

  it.each([
    [400, 'Unknown topic.'],
    [404, 'Book not found.'],
    [429, 'Too many requests right now. Try again in a moment.'],
    [502, 'The book service is having trouble.'],
    [504, 'The book service took too long to respond.'],
  ])('maps a %i response to a BooksApiError', async (status, message) => {
    invoke.mockResolvedValue(httpError(status, { error: message }))
    const err = await run(getBook('abc')).catch((e) => e)
    expect(err).toBeInstanceOf(BooksApiError)
    expect(err).toMatchObject({ status, message })
  })

  it('falls back to the standard message when the error body is not JSON', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { status: 504, json: async () => { throw new Error('x') } } } })
    await expect(run(getBook('abc'))).rejects.toMatchObject({ status: 504, message: 'The book service took too long to respond.' })
  })

  it('maps a network failure to 502', async () => {
    invoke.mockResolvedValue({ data: null, error: { name: 'FunctionsFetchError', context: new TypeError('Failed to fetch') } })
    await expect(run(getBook('abc'))).rejects.toMatchObject({ status: 502 })
    invoke.mockRejectedValue(new TypeError('boom'))
    await expect(run(getBook('abc'))).rejects.toMatchObject({ status: 502 })
  })

  it('rethrows an abort as AbortError, not a BooksApiError', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(run(getBook('abc', { signal: controller.signal }))).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('cleanText', () => {
  it('strips tags and decodes entities', () => {
    expect(cleanText('<b>Bold</b> &amp; &#39;quoted&#39; &lt;tag&gt;<br>next')).toBe("Bold & 'quoted' <tag>\nnext")
    expect(cleanText('<p>One</p><p>Two</p>')).toBe('One\nTwo')
  })
  it('returns null for empty input', () => {
    expect(cleanText(null)).toBeNull()
    expect(cleanText('<p> </p>')).toBeNull()
  })
})

describe('demo switches (no network call)', () => {
  it('?simulate=429 fails before calling the function', async () => {
    vi.stubGlobal('window', { location: { search: '?simulate=429' } })
    await expect(run(getBooks({ source: 'topic', topic: 'ai' }))).rejects.toMatchObject({ status: 429 })
    expect(invoke).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
