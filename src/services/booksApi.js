// Books API used by every page. It calls the `books` Supabase Edge Function
// (the only place that talks to Google Books) and keeps the same inputs,
// response shape and errors the UI has always seen.
//
// Force failure states for demos/tests by adding ?simulate=429|timeout|error|slow
// to any page URL. They short-circuit before the network call.

import { supabase, FUNCTION_REGION } from '../lib/supabase'
import { findGenre } from '../data/genres'
import { normalizeType, validateSearch } from '../lib/searchValidation'

export const MAX_START_INDEX = 200 // same cap the Edge Function enforces
export const TOPICS = ['programming', 'ai', 'computers']

export class BooksApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'BooksApiError'
    this.status = status
  }
}

const MESSAGES = {
  429: 'Too many requests right now. Try again in a moment.',
  502: 'The book service is having trouble.',
  504: 'The book service took too long to respond.',
}

const wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    const aborted = () => reject(new DOMException('Aborted', 'AbortError'))
    // An already-aborted signal never fires 'abort' again, so check it first
    if (signal?.aborted) return aborted()
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      aborted()
    }, { once: true })
  })

function simulateMode() {
  try {
    return new URLSearchParams(window.location.search).get('simulate')
  } catch {
    return null
  }
}

// Forced failures for demos and tests (no network call is made)
async function simulateFailure(signal) {
  const mode = simulateMode()
  if (mode === 'timeout') {
    await wait(1800, signal)
    throw new BooksApiError(504, MESSAGES[504])
  }
  if (mode === 'slow') await wait(2500, signal)
  if (mode === '429') {
    await wait(300, signal)
    throw new BooksApiError(429, MESSAGES[429])
  }
  if (mode === 'error') {
    await wait(300, signal)
    throw new BooksApiError(502, MESSAGES[502])
  }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' }

/** Google descriptions contain HTML: returns plain text (tags removed, entities decoded). */
export function cleanText(html) {
  if (typeof html !== 'string') return html ?? null
  const text = html
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\b[^>]*>/gi, '\n') // attributes allowed: <br clear=all>
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        try {
          return String.fromCodePoint(code)
        } catch {
          return m
        }
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text || null
}

const shape = (book) => ({ ...book, description: cleanText(book.description) })

// Calls an Edge Function and maps every failure to a BooksApiError
export async function callFunction(name, body, signal) {
  await simulateFailure(signal)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  let res
  try {
    res = await supabase.functions.invoke(name, { body, signal, region: FUNCTION_REGION })
  } catch (e) {
    if (signal?.aborted || e?.name === 'AbortError') throw new DOMException('Aborted', 'AbortError')
    throw new BooksApiError(502, MESSAGES[502])
  }
  const { data, error } = res
  if (!error) return data
  if (signal?.aborted || error.context?.name === 'AbortError') throw new DOMException('Aborted', 'AbortError')
  const response = error.context
  if (typeof response?.status === 'number') {
    let message
    try {
      message = (await response.json())?.error
    } catch {
      message = null
    }
    throw new BooksApiError(response.status, message || MESSAGES[response.status] || MESSAGES[502])
  }
  throw new BooksApiError(502, MESSAGES[502]) // network failure or relay error
}

const callBooks = (body, signal) => callFunction('books', body, signal)

/**
 * List books.
 * @param {object} p
 * @param {'topic'|'search'|'genre'} p.source
 * @param {string} [p.topic]  programming | ai | computers (source: topic)
 * @param {string} [p.q]      search text (source: search)
 * @param {string} [p.type]   all | title | author | isbn (source: search)
 * @param {string} [p.genre]  genre slug (source: genre)
 * @param {number} [p.page]   0-based page
 * @param {number} [p.pageSize]
 * @param {boolean} [p.kids]  hide mature books (Kid Korner mode)
 * @param {AbortSignal} [p.signal]
 * @returns {Promise<{ items: object[], page: number, nextPage: number|null, totalItems: number }>}
 */
export async function getBooks({ source, topic, q, type, genre, page = 0, pageSize = 20, kids = false, signal }) {
  // Validate before calling the network, exactly like the Edge Function does
  let body
  if (source === 'topic') {
    if (!TOPICS.includes(topic)) throw new BooksApiError(400, 'Unknown topic.')
    body = { source, topic }
  } else if (source === 'search') {
    const t = normalizeType(type)
    const problem = validateSearch(q, t)
    if (problem) throw new BooksApiError(400, problem)
    body = { source, q: q.trim(), type: t }
  } else if (source === 'genre') {
    if (!findGenre(genre)) throw new BooksApiError(400, 'Unknown genre.')
    body = { source, genre }
  } else {
    throw new BooksApiError(400, 'Unknown request.')
  }
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 40 || page * pageSize > MAX_START_INDEX) {
    throw new BooksApiError(400, 'Invalid page.')
  }

  const res = await callBooks({ ...body, page, pageSize, kids }, signal)
  // A 200 that isn't our JSON (e.g. a Wi-Fi login page) is an upstream failure, not a crash
  if (!Array.isArray(res?.items)) throw new BooksApiError(502, MESSAGES[502])
  return { items: res.items.map(shape), page: res.page, nextPage: res.nextPage ?? null, totalItems: res.totalItems }
}

/** One book by its Google Books volume ID. Throws 404 when it does not exist. */
export async function getBook(id, { signal } = {}) {
  if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new BooksApiError(400, 'Invalid book ID.')
  const book = await callBooks({ id }, signal)
  if (typeof book?.id !== 'string') throw new BooksApiError(502, MESSAGES[502])
  return shape(book)
}
