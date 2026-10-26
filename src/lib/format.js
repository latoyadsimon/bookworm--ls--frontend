export const formatAuthors = (authors) => (authors?.length ? authors.join(', ') : 'Unknown author')

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const formatDate = (iso) => (iso ? dateFormat.format(new Date(iso)) : '')

export const STATUS_LABELS = {
  want_to_read: 'Want to Read',
  reading: 'Reading',
  finished: 'Finished',
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
/** '2026-10-01' -> 'October 2026' (UTC, so the label never slips a month) */
export const formatMonth = (iso) => (iso ? monthFormat.format(new Date(`${iso.slice(0, 7)}-01T00:00:00Z`)) : '')
