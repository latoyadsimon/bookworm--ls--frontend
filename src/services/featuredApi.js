// Monthly featured book. The current pick comes from the `featured` Edge
// Function (it rotates to a new NYT best seller when a month starts); the
// history is read straight from the public `featured_books` table.

import { supabase } from '../lib/supabase'
import { BooksApiError, callFunction, cleanText } from './booksApi'

export const NYT_LABELS = {
  'hardcover-fiction': 'NYT Hardcover Fiction',
  'combined-print-and-e-book-nonfiction': 'NYT Combined Nonfiction',
}

/** "#1 NYT Hardcover Fiction", or "Starter pick" for the hand-picked first book. */
export function featuredLabel(nytList, nytRank) {
  const name = NYT_LABELS[nytList]
  if (!name) return 'Starter pick'
  return nytRank ? `#${nytRank} ${name}` : name
}

/** Table row or function response -> the book shape the cards use, plus month and label. */
export function toFeatured(row) {
  return {
    id: row.volume_id,
    title: row.title,
    authors: row.authors ?? [],
    thumbnail: row.thumbnail_url ?? null,
    description: cleanText(row.description),
    maturityRating: row.maturity_rating ?? 'NOT_MATURE',
    month: row.month,
    nytList: row.nyt_list ?? null,
    nytRank: row.nyt_rank ?? null,
    label: featuredLabel(row.nyt_list, row.nyt_rank),
    stale: row.stale === true,
  }
}

/** Every pick, newest first. Throws BooksApiError when the table can't be read. */
export async function listFeatured() {
  const { data, error } = await supabase.from('featured_books').select('*').order('month', { ascending: false })
  if (error) throw new BooksApiError(502, 'The featured picks are not available right now.')
  return (data ?? []).map(toFeatured)
}

/** Picks whose title or author contains `q` (case-insensitive). The history is small, so this runs in the browser. */
export async function searchFeatured(q) {
  const needle = (q ?? '').trim().toLowerCase()
  const all = await listFeatured()
  if (!needle) return all
  return all.filter((b) => [b.title, ...b.authors].some((t) => t.toLowerCase().includes(needle)))
}

/**
 * This month's pick. In Kid Korner a MATURE pick is replaced by the newest
 * NOT_MATURE one from the history (null when there is none).
 */
export async function getCurrentFeatured({ kids = false, signal } = {}) {
  const current = toFeatured(await callFunction('featured', {}, signal))
  if (!kids || current.maturityRating !== 'MATURE') return current
  return (await listFeatured()).find((b) => b.maturityRating !== 'MATURE') ?? null
}
