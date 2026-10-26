// Database access used by every page, through supabase-js as the signed-in
// reader. RLS decides what each reader may see and change: inserts don't send
// user_id (the column defaults to auth.uid()), and the user_id filters below
// only make each query's intent explicit.
//
// Demo switches: ?simulate=db (every database call fails),
// ?simulate=logs (loading logs fails), ?simulate=expired (writes report an expired session).

import { supabase } from '../lib/supabase'
import { NETWORK_ERROR, simulatedError } from './simulate'

export const STATUSES = ['want_to_read', 'reading', 'finished']

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
// LIKE wildcards (% _ \) plus PostgREST's own: it reads * in like/ilike values as %
const escapeLike = (s) => s.replace(/[\\%_*]/g, '\\$&')

/** Public, unique display names (ignoring case). */
export async function isDisplayNameTaken(name) {
  const { data } = await query(() =>
    supabase.from('profiles').select('id').ilike('display_name', escapeLike(name.trim())).limit(1),
  )
  return Array.isArray(data) && data.length > 0
}

export async function getProfile(id) {
  const res = await query(() => supabase.from('profiles').select('*').eq('id', id).maybeSingle())
  if (!res.error && !res.data) return fail({ message: 'Profile not found', code: 'PGRST116' })
  return res
}

/** A reader may update only their own row, and only display_name / theme. */
export async function updateProfile(authUserId, id, changes) {
  if (authUserId !== id) return ok(null) // what RLS answers anyway: zero rows updated
  const patch = {}
  if ('display_name' in changes) patch.display_name = String(changes.display_name).trim()
  if ('theme' in changes) patch.theme = changes.theme
  return query(() => supabase.from('profiles').update(patch).eq('id', id).select().maybeSingle(), { write: true })
}

// ---------- library_items (private) ----------
export async function getLibraryItem(authUserId, volumeId) {
  if (!authUserId) return ok(null) // guests have no library: nothing to ask the database
  return query(() =>
    supabase.from('library_items').select('*').eq('user_id', authUserId).eq('volume_id', volumeId).maybeSingle(),
  )
}

export async function listLibrary(authUserId, { status } = {}) {
  return query(() => {
    let q = supabase.from('library_items').select('*').eq('user_id', authUserId)
    if (status) q = q.eq('status', status)
    return q.order('created_at', { ascending: false })
  })
}

export async function addToLibrary(authUserId, { volume_id, title, authors = [], thumbnail_url = null }) {
  return query(
    () => supabase.from('library_items').insert({ volume_id, title, authors, thumbnail_url }).select().single(),
    { write: true },
  )
}

export async function updateLibraryStatus(authUserId, id, status) {
  return query(
    () => supabase.from('library_items').update({ status }).eq('id', id).eq('user_id', authUserId).select().maybeSingle(),
    { write: true },
  )
}

/** Deletes the item; its logs go with it (ON DELETE CASCADE in the database). */
export async function removeFromLibrary(authUserId, id) {
  return query(
    () => supabase.from('library_items').delete().eq('id', id).eq('user_id', authUserId).select().maybeSingle(),
    { write: true },
  )
}

export async function countLogsForItem(authUserId, libraryItemId) {
  return query(
    () => supabase.from('logs').select('id', { count: 'exact', head: true }).eq('library_item_id', libraryItemId).eq('user_id', authUserId),
    { pick: (res) => res.count ?? 0 },
  )
}

// ---------- logs (public to read) ----------
/** Every reader's logs for one book, newest first, with display names (never emails). */
export async function listLogsForVolume(volumeId) {
  return query(
    () => supabase.from('logs').select(LOG_COLUMNS).eq('volume_id', volumeId).order('created_at', { ascending: false }),
    { kind: 'logs' },
  )
}

export async function addLog(authUserId, { library_item_id, volume_id, body, rating = null }) {
  const text = typeof body === 'string' ? body.trim() : body
  return query(
    () => supabase.from('logs').insert({ library_item_id, volume_id, body: text, rating: rating ?? null }).select(LOG_COLUMNS).single(),
    { write: true },
  )
}

export async function updateLog(authUserId, id, { body, rating = null }) {
  const text = typeof body === 'string' ? body.trim() : body
  return query(
    () => supabase.from('logs').update({ body: text, rating: rating ?? null }).eq('id', id).eq('user_id', authUserId).select(LOG_COLUMNS).maybeSingle(),
    { write: true },
  )
}

export async function deleteLog(authUserId, id) {
  return query(
    () => supabase.from('logs').delete().eq('id', id).eq('user_id', authUserId).select().maybeSingle(),
    { write: true },
  )
}
