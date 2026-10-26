// Search rules shared by the search form and the books API (and, later, the Edge Function).
export const SEARCH_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'isbn', label: 'ISBN' },
  { value: 'featured', label: 'Featured' },
]

export const MAX_QUERY_LENGTH = 200

export const normalizeType = (type) =>
  SEARCH_TYPES.some((t) => t.value === type) ? type : 'all'

export const cleanIsbn = (q) => q.replace(/[\s-]/g, '').toUpperCase()

// Returns a user-facing error message, or null when the search is valid.
export function validateSearch(query, type) {
  const q = (query ?? '').trim()
  // An empty Featured search just lists every pick
  if (!q) return type === 'featured' ? null : 'Please enter a search term.'
  if (q.length > MAX_QUERY_LENGTH) return 'Search is too long (max 200 characters).'
  if (type === 'isbn' && !/^(\d{9}[\dX]|\d{13})$/.test(cleanIsbn(q))) {
    return 'ISBN must be 10 or 13 digits.'
  }
  return null
}
