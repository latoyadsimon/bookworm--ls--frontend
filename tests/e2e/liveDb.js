// Direct access to the live database for test cleanup only. Tests that write
// (library status, logs, theme) snapshot one seed reader first and restore it
// after, so the seed data stays as it was. RLS applies here too: the client
// signs in as that reader, so it can only touch that reader's rows.
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { seedReader } from './seedReaders.js'

const env = loadEnv('development', process.cwd(), 'VITE_')

// One signed-in client per seed reader per worker: Supabase Auth rate-limits sign-ins per IP,
// so the session is reused (autoRefreshToken keeps it valid) instead of signing in per call.
const sessions = new Map()

export function signedInAs(userId) {
  if (!sessions.has(userId)) {
    const reader = seedReader(userId)
    if (!reader) throw new Error(`liveDb: ${userId} is not a seed reader`)
    const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    sessions.set(userId, db.auth.signInWithPassword({ email: reader.email, password: reader.password }).then(({ error }) => {
      if (error) {
        sessions.delete(userId)
        throw new Error(`liveDb: sign-in failed: ${error.message}`)
      }
      return db
    }))
  }
  return sessions.get(userId)
}

const must = ({ data, error }) => {
  if (error) throw new Error(`live DB cleanup failed: ${error.message}`)
  return data
}

export async function snapshot(userId) {
  const db = await signedInAs(userId)
  return {
    userId,
    profile: must(await db.from('profiles').select('*').eq('id', userId).single()),
    items: must(await db.from('library_items').select('*').eq('user_id', userId)),
    logs: must(await db.from('logs').select('*').eq('user_id', userId)),
  }
}

// Exact restore: an UPDATE would fire the set_updated_at trigger, so any row that
// differs from its snapshot (or is new) is deleted and the snapshot row is
// inserted again with every original column. Unchanged rows are left alone.
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort())

export async function restore({ userId, profile, items, logs }) {
  const db = await signedInAs(userId)
  const snapItems = new Map(items.map((i) => [i.id, i]))
  const snapLogs = new Map(logs.map((l) => [l.id, l]))

  for (const l of must(await db.from('logs').select('*').eq('user_id', userId))) {
    if (!snapLogs.has(l.id) || !same(l, snapLogs.get(l.id))) must(await db.from('logs').delete().eq('id', l.id).eq('user_id', userId))
  }
  // Deleting an item cascades its logs; they are re-inserted below from the snapshot
  for (const i of must(await db.from('library_items').select('*').eq('user_id', userId))) {
    if (!snapItems.has(i.id) || !same(i, snapItems.get(i.id))) must(await db.from('library_items').delete().eq('id', i.id).eq('user_id', userId))
  }
  const haveItems = new Set(must(await db.from('library_items').select('id').eq('user_id', userId)).map((i) => i.id))
  for (const item of items) if (!haveItems.has(item.id)) must(await db.from('library_items').insert(item))
  const haveLogs = new Set(must(await db.from('logs').select('id').eq('user_id', userId)).map((l) => l.id))
  for (const log of logs) if (!haveLogs.has(log.id)) must(await db.from('logs').insert(log))

  // A reader may only UPDATE display_name and theme, so profiles.updated_at cannot be restored
  const now = must(await db.from('profiles').select('theme, display_name').eq('id', userId).single())
  if (now.theme !== profile.theme || now.display_name !== profile.display_name) {
    must(await db.from('profiles').update({ theme: profile.theme, display_name: profile.display_name }).eq('id', userId))
  }
}
