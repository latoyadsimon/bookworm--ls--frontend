import { describe, expect, it } from 'vitest'
import { cleanIsbn, normalizeType, validateSearch } from '../../src/lib/searchValidation'

describe('validateSearch', () => {
  it('accepts a normal search', () => {
    expect(validateSearch('dune', 'title')).toBeNull()
  })

  it('rejects an empty or blank search', () => {
    expect(validateSearch('', 'all')).toBe('Please enter a search term.')
    expect(validateSearch('   ', 'all')).toBe('Please enter a search term.')
    expect(validateSearch(undefined, 'all')).toBe('Please enter a search term.')
  })

  it('allows 200 characters but not 201', () => {
    expect(validateSearch('a'.repeat(200), 'all')).toBeNull()
    expect(validateSearch('a'.repeat(201), 'all')).toBe('Search is too long (max 200 characters).')
  })

  it('accepts 10 and 13 digit ISBNs, with dashes, spaces or a final X', () => {
    expect(validateSearch('0-306-40615-2', 'isbn')).toBeNull()
    expect(validateSearch('978 0 306 40615 7', 'isbn')).toBeNull()
    expect(validateSearch('080442957x', 'isbn')).toBeNull()
  })

  it('rejects ISBNs with the wrong length or letters', () => {
    expect(validateSearch('12345', 'isbn')).toBe('ISBN must be 10 or 13 digits.')
    expect(validateSearch('97803064061', 'isbn')).toBe('ISBN must be 10 or 13 digits.')
    expect(validateSearch('abcdefghij', 'isbn')).toBe('ISBN must be 10 or 13 digits.')
  })

  it('only checks the ISBN format when searching by ISBN', () => {
    expect(validateSearch('12345', 'all')).toBeNull()
  })
})

describe('featured search', () => {
  it('allows an empty query for the featured type only', () => {
    expect(validateSearch('', 'featured')).toBeNull()
    expect(validateSearch('   ', 'featured')).toBeNull()
    expect(validateSearch('', 'title')).toBe('Please enter a search term.')
  })

  it('still caps the length', () => {
    expect(validateSearch('a'.repeat(201), 'featured')).toBe('Search is too long (max 200 characters).')
  })
})

describe('normalizeType', () => {
  it('knows the featured type', () => expect(normalizeType('featured')).toBe('featured'))

  it('keeps known search types and falls back to "all"', () => {
    expect(normalizeType('author')).toBe('author')
    expect(normalizeType('publisher')).toBe('all')
    expect(normalizeType(undefined)).toBe('all')
  })
})

describe('cleanIsbn', () => {
  it('removes dashes and spaces and uppercases the check digit', () => {
    expect(cleanIsbn('0-8044-2957-x')).toBe('080442957X')
  })
})
