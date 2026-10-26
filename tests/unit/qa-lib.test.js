// QA audit: edge cases for the pure helpers in src/lib (search rules, formatting,
// the return-path helper) and booksApi's cleanText.
import { describe, expect, it } from 'vitest'
import { MAX_QUERY_LENGTH, cleanIsbn, normalizeType, validateSearch } from '../../src/lib/searchValidation'
import { STATUS_LABELS, formatAuthors, formatDate, formatMonth, plural } from '../../src/lib/format'
import { returnPath } from '../../src/context/auth-context'
import { cleanText } from '../../src/services/booksApi'

describe('validateSearch edge cases', () => {
  it.each([' ', '\t\n', '  ', '　'])('treats whitespace-only %j as empty', (q) => {
    expect(validateSearch(q, 'all')).toBe('Please enter a search term.')
    expect(validateSearch(q, 'featured')).toBeNull()
  })

  it('handles null and undefined queries without throwing', () => {
    expect(validateSearch(undefined, 'title')).toBe('Please enter a search term.')
    expect(validateSearch(null, 'isbn')).toBe('Please enter a search term.')
  })

  it('counts length after trimming: 200 chars plus padding is fine, 201 is not', () => {
    expect(validateSearch(`   ${'a'.repeat(MAX_QUERY_LENGTH)}   `, 'all')).toBeNull()
    expect(validateSearch(`  ${'a'.repeat(MAX_QUERY_LENGTH + 1)}  `, 'all')).toMatch(/too long/)
  })

  it('accepts unicode queries up to the limit', () => {
    expect(validateSearch('Les Misérables', 'title')).toBeNull()
    expect(validateSearch('é'.repeat(200), 'title')).toBeNull()
    expect(validateSearch('東京'.repeat(100), 'all')).toBeNull()
  })

  it('applies the same UTF-16 length rule as the Edge Function (emoji count as 2)', () => {
    // books/index.ts also uses term.length, so client and server agree
    expect(validateSearch('😀'.repeat(100), 'all')).toBeNull()
    expect(validateSearch('😀'.repeat(101), 'all')).toMatch(/too long/)
  })

  it.each([
    ['0-306-40615-2', null],
    ['978 0 306 40615 7', null],
    [' 978-0-306-40615-7 ', null],
    ['030640615x', null], // lowercase check digit
    ['0 3 0 6 4 0 6 1 5 X', null],
    ['X306406152', 'ISBN must be 10 or 13 digits.'], // X only allowed last
    ['978030640615X', 'ISBN must be 10 or 13 digits.'], // no X on ISBN-13
    ['0.306.40615.2', 'ISBN must be 10 or 13 digits.'], // dots are not separators
    ['٠٣٠٦٤٠٦١٥٢', 'ISBN must be 10 or 13 digits.'], // Arabic-Indic digits
    ['12345678901', 'ISBN must be 10 or 13 digits.'], // 11 digits
    ['97803064061577', 'ISBN must be 10 or 13 digits.'], // 14 digits
  ])('ISBN %j -> %j', (q, expected) => {
    expect(validateSearch(q, 'isbn')).toBe(expected)
  })

  it('cleanIsbn strips every separator kind it supports', () => {
    expect(cleanIsbn('0-306 40615-x')).toBe('030640615X')
    expect(cleanIsbn('\t978\n0306406157')).toBe('9780306406157')
  })

  it('normalizeType rejects prototype keys, casing and non-strings', () => {
    for (const t of ['constructor', '__proto__', 'Title', 'ISBN', ' title', null, undefined, 42, {}]) {
      expect(normalizeType(t)).toBe('all')
    }
  })
})

describe('format helpers', () => {
  it('formatAuthors falls back for missing or empty lists', () => {
    expect(formatAuthors(undefined)).toBe('Unknown author')
    expect(formatAuthors(null)).toBe('Unknown author')
    expect(formatAuthors([])).toBe('Unknown author')
    expect(formatAuthors(['A', 'B', 'C'])).toBe('A, B, C')
  })

  it('plural handles 0, 1 and many', () => {
    expect(plural(0, 'log')).toBe('0 logs')
    expect(plural(1, 'log')).toBe('1 log')
    expect(plural(2, 'book')).toBe('2 books')
  })

  it('formatDate returns an empty string for missing dates', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
  })

  it('formatDate formats a Postgres timestamptz', () => {
    expect(formatDate('2026-10-25T15:30:00.123456+00:00')).toMatch(/^Oct 2[456], 2026$/)
  })

  // QA-BUG: formatDate throws "RangeError: Invalid time value" for an unparsable
  // timestamp (Intl.DateTimeFormat.format(Invalid Date)), which would crash LogList /
  // LibraryPage into the crash screen instead of showing a blank date.
  it('formatDate does not throw for an unparsable value', () => {
    expect(() => formatDate('not-a-date')).not.toThrow()
  })

  it.each([
    ['2026-12-01', 'December 2026'],
    ['2026-01-01', 'January 2026'],
    ['2026-12-31T23:59:59-08:00', 'December 2026'], // only the YYYY-MM part is used
    ['2027-01-01T00:00:00+14:00', 'January 2027'],
  ])('formatMonth(%j) is %j in any time zone', (iso, label) => {
    expect(formatMonth(iso)).toBe(label)
  })

  it('formatMonth returns an empty string for missing input', () => {
    expect(formatMonth(null)).toBe('')
    expect(formatMonth('')).toBe('')
  })

  it('STATUS_LABELS covers exactly the three database statuses', () => {
    expect(Object.keys(STATUS_LABELS)).toEqual(['want_to_read', 'reading', 'finished'])
  })
})

describe('returnPath', () => {
  it('keeps path and search from a location object', () => {
    expect(returnPath({ pathname: '/library', search: '?status=reading' })).toBe('/library?status=reading')
    expect(returnPath({ pathname: '/books/abc' })).toBe('/books/abc')
  })

  it('falls back to Home for missing or off-site values', () => {
    expect(returnPath(null)).toBe('/')
    expect(returnPath('')).toBe('/')
    expect(returnPath('https://evil.example/')).toBe('/')
    expect(returnPath({})).toBe('/')
  })
})

describe('cleanText edge cases', () => {
  it('never leaves a tag in the output, even for script and malformed markup', () => {
    const out = cleanText('<script>alert(1)</script><img src=x onerror=alert(1)>Hi<b')
    expect(out).not.toMatch(/<(script|img)/i)
    expect(out).toContain('Hi')
  })

  it('strips nested tags and keeps the text order', () => {
    expect(cleanText('<div><p>One <i>two <b>three</b></i></p></div>')).toBe('One two three')
  })

  it('decodes once only (no double-decoding of &amp;lt;)', () => {
    expect(cleanText('&amp;lt;b&amp;gt;')).toBe('&lt;b&gt;')
  })

  it('decodes numeric, hex and named entities, and leaves unknown ones alone', () => {
    expect(cleanText('&#39;a&#x27; &QUOT;b&quot; &hellip; &foo; &#x1F600;')).toBe('\'a\' "b" … &foo; 😀')
  })

  it('leaves an out-of-range code point as written instead of throwing', () => {
    expect(cleanText('x &#99999999; y')).toBe('x &#99999999; y')
  })

  it('turns self-closing and upper-case breaks into newlines', () => {
    expect(cleanText('a<BR/>b<br />c<P>d</P>e')).toBe('a\nb\ncd\ne')
  })

  // QA-BUG: a <br> or </p> with attributes or extra spacing (e.g. <br clear="all">) is
  // stripped without a newline, so "end.<br clear=all>Start" becomes "end.Start".
  it('treats <br> with attributes as a line break', () => {
    expect(cleanText('end.<br clear="all">Start')).toBe('end.\nStart')
  })

  it('collapses runs of blank lines and spaces', () => {
    expect(cleanText('<p>a</p><p></p><p></p><p></p><p>b</p>')).toBe('a\n\nb')
    expect(cleanText('a&nbsp;&nbsp;&nbsp;b')).toBe('a b')
  })

  it('passes non-strings through and handles very long input quickly', () => {
    expect(cleanText(undefined)).toBeNull()
    expect(cleanText(42)).toBe(42)
    const big = '<p>word &amp; word</p>'.repeat(20000)
    const t0 = performance.now()
    const out = cleanText(big)
    expect(performance.now() - t0).toBeLessThan(1000)
    expect(out.startsWith('word & word\nword & word')).toBe(true)
  })
})
