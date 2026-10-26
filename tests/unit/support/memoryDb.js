// Test helper: an in-memory model of the BookWorm database. Functions return
// supabase-js style `{ data, error }` and enforce the same rules the real
// constraints, RLS policies and grants do (db.test.js documents them):
//   - library_items: visible to and changeable by their owner only
//   - logs: readable by everyone; written only by their author, and only for a
//     book in the author's own library (composite foreign key)
//   - removing a library item deletes its logs (ON DELETE CASCADE)
// The app itself always uses Supabase (src/services/db.js).

import { MODES } from '../../../src/theme/modes'
import { simulatedError } from '../../../src/services/simulate'

const THEMES = MODES.map((m) => m.key)
export const STATUSES = ['want_to_read', 'reading', 'finished']
const now = () => new Date().toISOString()
const fail = (message, code) => ({ data: null, error: { message, code } })
const ok = (data) => ({ data, error: null })

// ---------- tables ----------
const profiles = new Map() // id -> { id, display_name, theme, created_at, updated_at }
const libraryItems = new Map() // id -> { id, user_id, volume_id, title, authors, thumbnail_url, status, created_at, updated_at }
const logs = new Map() // id -> { id, user_id, library_item_id, volume_id, body, rating, created_at, updated_at }

// ---------- simulated network ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function request({ write = false, kind } = {}) {
  await wait(180 + Math.random() * 220)
  return simulatedError({ write, kind })
}

// ---------- profiles ----------
const nameKey = (name) => name.trim().toLowerCase()

export function isDisplayNameTaken(name) {
  const key = nameKey(name)
  return [...profiles.values()].some((p) => nameKey(p.display_name) === key)
}

/**
 * Mirrors the `handle_new_user` trigger: creates the profile for a new auth user.
 * Throws like Postgres would when a constraint fails, which aborts the sign-up.
 */
export function createProfileForUser(user) {
  const display_name = (user.user_metadata?.display_name ?? '').trim()
  if (display_name.length < 2 || display_name.length > 30) {
    throw new Error('violates check constraint "profiles_display_name_format"')
  }
  if (isDisplayNameTaken(display_name)) {
    throw new Error('duplicate key value violates unique constraint "profiles_display_name_lower_key"')
  }
  const row = { id: user.id, display_name, theme: user.user_metadata?.theme ?? 'street-royalty', created_at: now(), updated_at: now() }
  profiles.set(user.id, row)
  return row
}

export function getProfile(id) {
  const row = profiles.get(id)
  return row ? ok({ ...row }) : fail('Profile not found', 'PGRST116')
}

/** RLS: a user may update only their own row, and only display_name / theme. */
export function updateProfile(authUserId, id, changes) {
  if (!authUserId || authUserId !== id) return ok(null) // RLS filters it out: 0 rows
  const row = profiles.get(id)
  if (!row) return ok(null)
  const next = { ...row }
  if ('display_name' in changes) {
    const name = String(changes.display_name).trim()
    if (name.length < 2 || name.length > 30) return fail('violates check constraint "profiles_display_name_format"', '23514')
    if (nameKey(name) !== nameKey(row.display_name) && isDisplayNameTaken(name)) {
      return fail('duplicate key value violates unique constraint "profiles_display_name_lower_key"', '23505')
    }
    next.display_name = name
  }
  if ('theme' in changes) {
    if (!THEMES.includes(changes.theme)) return fail('violates check constraint "profiles_theme_valid"', '23514')
    next.theme = changes.theme
  }
  next.updated_at = now()
  profiles.set(id, next)
  return ok({ ...next })
}

// ---------- library_items (private) ----------
const own = (authUserId) => [...libraryItems.values()].filter((i) => i.user_id === authUserId)
const byNewest = (a, b) => b.created_at.localeCompare(a.created_at)

/** The signed-in reader's library item for one book, or null. */
export async function getLibraryItem(authUserId, volumeId) {
  const err = await request()
  if (err) return { data: null, error: err }
  if (!authUserId) return ok(null)
  const row = own(authUserId).find((i) => i.volume_id === volumeId)
  return ok(row ? { ...row } : null)
}

/** The signed-in reader's whole library, newest first. Optional status filter. */
export async function listLibrary(authUserId, { status } = {}) {
  const err = await request()
  if (err) return { data: null, error: err }
  if (!authUserId) return fail('permission denied for table library_items', '42501') // anon has no access
  return ok(own(authUserId).filter((i) => !status || i.status === status).sort(byNewest).map((i) => ({ ...i })))
}

export async function addToLibrary(authUserId, { volume_id, title, authors = [], thumbnail_url = null }) {
  const err = await request({ write: true })
  if (err) return { data: null, error: err }
  if (!authUserId) return fail('permission denied for table library_items', '42501')
  if (!volume_id || volume_id.length > 64) return fail('violates check constraint "library_items_volume_id_length"', '23514')
  if (!title) return fail('violates check constraint "library_items_title_length"', '23514')
  // Real covers must be https. Mock covers are inline SVG data URIs, which are allowed here only.
  if (thumbnail_url && !/^(https:\/\/|data:image\/)/.test(thumbnail_url)) {
    return fail('violates check constraint "library_items_thumbnail_https"', '23514')
  }
  if (own(authUserId).some((i) => i.volume_id === volume_id)) {
    return fail('duplicate key value violates unique constraint "library_items_user_volume_key"', '23505')
  }
  const row = {
    id: crypto.randomUUID(), user_id: authUserId, volume_id, title, authors, thumbnail_url,
    status: 'want_to_read', created_at: now(), updated_at: now(),
  }
  libraryItems.set(row.id, row)
  return ok({ ...row })
}

/** Column grant: readers may only change `status`. */
export async function updateLibraryStatus(authUserId, id, status) {
  const err = await request({ write: true })
  if (err) return { data: null, error: err }
  if (!STATUSES.includes(status)) return fail('violates check constraint "library_items_status_valid"', '23514')
  const row = libraryItems.get(id)
  if (!row || row.user_id !== authUserId) return ok(null) // RLS: 0 rows
  const next = { ...row, status, updated_at: now() }
  libraryItems.set(id, next)
  return ok({ ...next })
}

/** Deletes the item; its logs go with it (ON DELETE CASCADE). */
export async function removeFromLibrary(authUserId, id) {
  const err = await request({ write: true })
  if (err) return { data: null, error: err }
  const row = libraryItems.get(id)
  if (!row || row.user_id !== authUserId) return ok(null) // RLS: 0 rows
  libraryItems.delete(id)
  for (const log of [...logs.values()]) if (log.library_item_id === id) logs.delete(log.id)
  return ok({ ...row })
}

export async function countLogsForItem(authUserId, libraryItemId) {
  const err = await request()
  if (err) return { data: null, error: err }
  return ok([...logs.values()].filter((l) => l.library_item_id === libraryItemId && l.user_id === authUserId).length)
}

// ---------- logs (public to read) ----------
const withAuthor = (log) => ({ ...log, profiles: { display_name: profiles.get(log.user_id)?.display_name ?? 'Unknown reader' } })

/** Every reader's logs for one book, newest first, with display names (never emails). */
export async function listLogsForVolume(volumeId) {
  const err = await request({ kind: 'logs' })
  if (err) return { data: null, error: err }
  return ok([...logs.values()].filter((l) => l.volume_id === volumeId).sort(byNewest).map(withAuthor))
}

function checkLogFields({ body, rating }) {
  if (typeof body !== 'string' || body.trim().length < 1 || body.trim().length > 5000) {
    return fail('violates check constraint "logs_body_length"', '23514')
  }
  if (rating != null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    return fail('violates check constraint "logs_rating_range"', '23514')
  }
  return null
}

export async function addLog(authUserId, { library_item_id, volume_id, body, rating = null }) {
  const err = await request({ write: true })
  if (err) return { data: null, error: err }
  if (!authUserId) return fail('permission denied for table logs', '42501')
  const bad = checkLogFields({ body, rating })
  if (bad) return bad
  // Composite FK (library_item_id, user_id, volume_id) -> library_items(id, user_id, volume_id)
  const item = libraryItems.get(library_item_id)
  if (!item || item.user_id !== authUserId || item.volume_id !== volume_id) {
    return fail('insert or update on table "logs" violates foreign key constraint "logs_library_item_fkey"', '23503')
  }
  const row = {
    id: crypto.randomUUID(), user_id: authUserId, library_item_id, volume_id,
    body: body.trim(), rating: rating ?? null, created_at: now(), updated_at: now(),
  }
  logs.set(row.id, row)
  return ok(withAuthor(row))
}

/** Column grant: authors may only change `body` and `rating`. */
export async function updateLog(authUserId, id, { body, rating = null }) {
  const err = await request({ write: true })
  if (err) return { data: null, error: err }
  const bad = checkLogFields({ body, rating })
  if (bad) return bad
  const row = logs.get(id)
  if (!row || row.user_id !== authUserId) return ok(null) // RLS: 0 rows
  const next = { ...row, body: body.trim(), rating: rating ?? null, updated_at: now() }
  logs.set(id, next)
  return ok(withAuthor(next))
}

export async function deleteLog(authUserId, id) {
  const err = await request({ write: true })
  if (err) return { data: null, error: err }
  const row = logs.get(id)
  if (!row || row.user_id !== authUserId) return ok(null) // RLS: 0 rows
  logs.delete(id)
  return ok({ ...row })
}
