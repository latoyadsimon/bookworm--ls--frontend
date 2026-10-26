// User isolation against the LIVE database, through PostgREST (supabase-js), the
// way a grader would test it: as a guest (anon), as reader A and as reader B.
// Run with `npm run test:rls`. Nothing here may change data; as a safety net both
// readers are snapshotted first and restored afterwards (tests/e2e/liveDb.js).
//
// Note on RLS: an UPDATE or DELETE on rows you don't own is not an error. The
// policy hides those rows, so the statement matches 0 rows. Each attack therefore
// checks that nothing came back AND that the victim's data is unchanged.
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { restore, signedInAs, snapshot } from '../e2e/liveDb.js'

const env = loadEnv('development', process.cwd(), 'VITE_')
const A = '00000000-0000-4000-a000-000000000002' // PageTurner
const B = '00000000-0000-4000-a000-000000000003' // QuietReader
const BOOK = 'LhOlDwAAQBAJ' // in both readers' libraries

let guest, asA, asB, before, bItem, bLog

beforeAll(async () => {
  guest = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  asA = await signedInAs(A)
  asB = await signedInAs(B)
  before = { a: await snapshot(A), b: await snapshot(B) }
  bItem = before.b.items.find((i) => i.volume_id === BOOK)
  bLog = before.b.logs.find((l) => l.library_item_id === bItem?.id)
  expect(bItem, 'B owns a library item to attack').toBeTruthy()
  expect(bLog, 'B has a log on that book to attack').toBeTruthy()
})

afterAll(async () => {
  if (!before) return
  // B must be exactly as before; restore() only writes if something changed
  const after = await snapshot(B)
  await restore(before.b)
  await restore(before.a)
  expect(after.items).toEqual(before.b.items)
  expect(after.logs).toEqual(before.b.logs)
  expect(after.profile).toEqual(before.b.profile)
})

describe('a guest (anon)', () => {
  it('cannot read any library', async () => {
    const { data, error } = await guest.from('library_items').select('*')
    expect(data).toBeNull()
    expect(error.code).toBe('42501')
  })

  it('cannot add to a library, or edit or delete a log', async () => {
    expect((await guest.from('library_items').insert({ user_id: B, volume_id: 'x', title: 'x' })).error.code).toBe('42501')
    expect((await guest.from('logs').update({ body: 'hacked' }).eq('id', bLog.id)).error.code).toBe('42501')
    expect((await guest.from('logs').delete().eq('id', bLog.id)).error.code).toBe('42501')
  })

  it('cannot rename a reader', async () => {
    expect((await guest.from('profiles').update({ display_name: 'Hacked42' }).eq('id', B)).error.code).toBe('42501')
  })

  it('can read every log and display name, but no email exists to read', async () => {
    const logs = await guest.from('logs').select('id, body, profiles(display_name)').eq('volume_id', BOOK)
    expect(logs.error).toBeNull()
    expect(logs.data.map((l) => l.id)).toContain(bLog.id)
    const profile = await guest.from('profiles').select('*').eq('id', B).single()
    expect(profile.data.display_name).toBe('QuietReader')
    expect(profile.data).not.toHaveProperty('email')
  })
})

describe('reader A against reader B', () => {
  it('A sees only A’s own library', async () => {
    const { data, error } = await asA.from('library_items').select('user_id')
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
    expect(new Set(data.map((r) => r.user_id))).toEqual(new Set([A]))
    expect((await asA.from('library_items').select('*').eq('user_id', B)).data).toEqual([])
  })

  it('A cannot change or remove B’s library item (0 rows)', async () => {
    expect((await asA.from('library_items').update({ status: 'finished' }).eq('id', bItem.id).select()).data).toEqual([])
    expect((await asA.from('library_items').delete().eq('id', bItem.id).select()).data).toEqual([])
  })

  it('A cannot edit or delete B’s log (0 rows), but can read it', async () => {
    expect((await asA.from('logs').update({ body: 'hacked' }).eq('id', bLog.id).select()).data).toEqual([])
    expect((await asA.from('logs').delete().eq('id', bLog.id).select()).data).toEqual([])
    expect((await asA.from('logs').select('body').eq('id', bLog.id).single()).data.body).toBe(bLog.body)
  })

  it('A cannot rename B (0 rows)', async () => {
    expect((await asA.from('profiles').update({ display_name: 'Hacked42' }).eq('id', B).select()).data).toEqual([])
  })

  it('A cannot save a book into B’s library (RLS with check: 42501)', async () => {
    const { error } = await asA.from('library_items').insert({ user_id: B, volume_id: 'isolation-test', title: 'x' })
    expect(error.code).toBe('42501')
  })

  it('A cannot attach a log to B’s library item (composite foreign key: 23503)', async () => {
    // user_id defaults to A, so RLS allows the row; the database still refuses it,
    // because (library_item_id, user_id, volume_id) must match one of A's own items
    const { error } = await asA.from('logs').insert({ library_item_id: bItem.id, volume_id: BOOK, body: 'not my book' })
    expect(error.code).toBe('23503')
  })

  it('B still sees B’s own data', async () => {
    const { data } = await asB.from('library_items').select('id').eq('id', bItem.id)
    expect(data).toEqual([{ id: bItem.id }])
  })
})
