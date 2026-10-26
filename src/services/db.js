// Database access used by every page. Same exports and `{ data, error }` shapes
// as before; the seed readers (see mock/seed.js) read and write through
// supabase-js, always scoped to their own user_id. Readers who signed up this
// session are not saved to Supabase, so their calls go to the in-memory store
// in mock/memoryDb.js (same rules, resets on refresh).
//
// Demo switches: ?simulate=db (every database call fails),
// ?simulate=logs (loading logs fails), ?simulate=expired (writes report an expired session).

import { supabase } from '../lib/supabase'
import { isPersistedUser } from './mock/seed'
import * as memory from './mock/memoryDb'
import { NETWORK_ERROR, simulatedError } from './simulate'

export { STATUSES, createProfileForUser } from './mock/memoryDb'

const ok = (data) => ({ data, error: null })
const fail = (error) => ({ data: null, error })
const LOG_COLUMNS = '*, profiles(display_name)'

// Runs one supabase-js query and returns `{ data, error }`. A failed network
// call has no Postgres code, so it is reported like the mock's network error.
async function query(build, opts) {
  const forced = simulatedError(opts)
  if (forced) return fail(forced)
  try {
    const res = await build()
    if (res.error) return fail(res.error.code ? res.error : NETWORK_ERROR)
    return ok(opts?.pick ? opts.pick(res) : (res.data ?? null))
  } catch {
    return fail(NETWORK_ERROR)
  }
}

// ---------- profiles ----------
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&')

/** Public, unique display names (ignoring case): checks the database and this session's readers. */
export async function isDisplayNameTaken(name) {
  if (memory.isDisplayNameTaken(name)) return true
  const { data } = await query(() =>
    supabase.from('profiles').select('id').ilike('display_name', escapeLike(name.trim())).limit(1),
  )
  return Array.isArray(data) && data.length > 0
}

export async function getProfile(id) {
  if (!isPersistedUser(id)) return memory.getProfile(id)
  const res = await query(() => supabase.from('profiles').select('*').eq('id', id).maybeSingle())
  if (!res.error && !res.data) return fail({ message: 'Profile not found', code: 'PGRST116' })
  return res
}

/** A reader may update only their own row, and only display_name / theme. */
export async function updateProfile(authUserId, id, changes) {
  if (!isPersistedUser(id) || authUserId !== id) return memory.updateProfile(authUserId, id, changes)
  const patch = {}
  if ('display_name' in changes) {
    patch.display_name = String(changes.display_name).trim()
    if (memory.isDisplayNameTaken(patch.display_name)) {
      return fail({ message: 'duplicate key value violates unique constraint "profiles_display_name_lower_key"', code: '23505' })
    }
  }
  if ('theme' in changes) patch.theme = changes.theme
  return query(() => supabase.from('profiles').update(patch).eq('id', id).select().maybeSingle(), { write: true })
}

// ---------- library_items (private) ----------
export async function getLibraryItem(authUserId, volumeId) {
  if (!isPersistedUser(authUserId)) return memory.getLibraryItem(authUserId, volumeId)
  return query(() =>
    supabase.from('library_items').select('*').eq('user_id', authUserId).eq('volume_id', volumeId).maybeSingle(),
  )
}

export async function listLibrary(authUserId, { status } = {}) {
  if (!isPersistedUser(authUserId)) return memory.listLibrary(authUserId, { status })
  return query(() => {
    let q = supabase.from('library_items').select('*').eq('user_id', authUserId)
    if (status) q = q.eq('status', status)
    return q.order('created_at', { ascending: false })
  })
}

export async function addToLibrary(authUserId, { volume_id, title, authors = [], thumbnail_url = null }) {
  if (!isPersistedUser(authUserId)) return memory.addToLibrary(authUserId, { volume_id, title, authors, thumbnail_url })
  return query(
    () => supabase.from('library_items').insert({ user_id: authUserId, volume_id, title, authors, thumbnail_url }).select().single(),
    { write: true },
  )
}

export async function updateLibraryStatus(authUserId, id, status) {
  if (!isPersistedUser(authUserId)) return memory.updateLibraryStatus(authUserId, id, status)
  return query(
    () => supabase.from('library_items').update({ status }).eq('id', id).eq('user_id', authUserId).select().maybeSingle(),
    { write: true },
  )
}

/** Deletes the item; its logs go with it (ON DELETE CASCADE in the database). */
export async function removeFromLibrary(authUserId, id) {
  if (!isPersistedUser(authUserId)) return memory.removeFromLibrary(authUserId, id)
  return query(
    () => supabase.from('library_items').delete().eq('id', id).eq('user_id', authUserId).select().maybeSingle(),
    { write: true },
  )
}

export async function countLogsForItem(authUserId, libraryItemId) {
  if (!isPersistedUser(authUserId)) return memory.countLogsForItem(authUserId, libraryItemId)
  return query(
    () => supabase.from('logs').select('id', { count: 'exact', head: true }).eq('library_item_id', libraryItemId).eq('user_id', authUserId),
    { pick: (res) => res.count ?? 0 },
  )
}

// ---------- logs (public to read) ----------
const byNewest = (a, b) => b.created_at.localeCompare(a.created_at)

/** Every reader's logs for one book, newest first, with display names (never emails). */
export async function listLogsForVolume(volumeId) {
  const [saved, session] = await Promise.all([
    query(() => supabase.from('logs').select(LOG_COLUMNS).eq('volume_id', volumeId).order('created_at', { ascending: false }), { kind: 'logs' }),
    memory.listLogsForVolume(volumeId),
  ])
  if (saved.error) return saved
  if (session.error) return session
  return ok([...saved.data, ...session.data].sort(byNewest))
}

export async function addLog(authUserId, { library_item_id, volume_id, body, rating = null }) {
  if (!isPersistedUser(authUserId)) return memory.addLog(authUserId, { library_item_id, volume_id, body, rating })
  const text = typeof body === 'string' ? body.trim() : body
  return query(
    () => supabase.from('logs').insert({ user_id: authUserId, library_item_id, volume_id, body: text, rating: rating ?? null }).select(LOG_COLUMNS).single(),
    { write: true },
  )
}

export async function updateLog(authUserId, id, { body, rating = null }) {
  if (!isPersistedUser(authUserId)) return memory.updateLog(authUserId, id, { body, rating })
  const text = typeof body === 'string' ? body.trim() : body
  return query(
    () => supabase.from('logs').update({ body: text, rating: rating ?? null }).eq('id', id).eq('user_id', authUserId).select(LOG_COLUMNS).maybeSingle(),
    { write: true },
  )
}

export async function deleteLog(authUserId, id) {
  if (!isPersistedUser(authUserId)) return memory.deleteLog(authUserId, id)
  return query(
    () => supabase.from('logs').delete().eq('id', id).eq('user_id', authUserId).select().maybeSingle(),
    { write: true },
  )
}
