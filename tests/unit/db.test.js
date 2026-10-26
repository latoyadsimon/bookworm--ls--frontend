import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as db from '../../src/services/mock/memoryDb'
import { run } from './helpers'

// The in-memory store (readers who sign up during a session) enforces the same
// rules as the Postgres constraints, RLS policies and grants. These cases are
// the checklist for the real schema too.
const ME = 'u-me'
const OTHER = 'u-other'
const vol = ['vol-A', 'vol-B', 'vol-C', 'vol-D']
const CATALOG = Object.fromEntries(vol.map((id, i) => [i === 0 ? 0 : i === 1 ? 31 : i === 2 ? 3 : 150, { id }]))

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

beforeAll(async () => {
  vi.useFakeTimers()
  db.createProfileForUser({ id: ME, user_metadata: { display_name: 'BookLover42' } })
  db.createProfileForUser({ id: OTHER, user_metadata: { display_name: 'PageTurner' } })
  db.createProfileForUser({ id: 'u-third', user_metadata: { display_name: 'QuietReader' } })
  const add = async (user, v, status, logs) => {
    const item = (await run(db.addToLibrary(user, { volume_id: v, title: v }))).data
    await run(db.updateLibraryStatus(user, item.id, status))
    for (const body of logs) await run(db.addLog(user, { library_item_id: item.id, volume_id: v, body, rating: 4 }))
  }
  await add(ME, 'vol-A', 'reading', ['one', 'two'])
  await add(ME, 'vol-B', 'finished', ['great'])
  await add(ME, 'vol-C', 'want_to_read', [])
  await add(OTHER, 'vol-A', 'finished', ['nice'])
  await add(OTHER, 'vol-B', 'reading', ['ok'])
  vi.useRealTimers()
})

const myItemFor = async (bookIndex) =>
  (await run(db.listLibrary(ME))).data.find((i) => i.volume_id === CATALOG[bookIndex].id)

describe('library_items (private to the owner)', () => {
  it('guests cannot read any library', async () => {
    expect((await run(db.listLibrary(null))).error.code).toBe('42501')
  })

  it('a reader sees only their own books', async () => {
    const { data } = await run(db.listLibrary(ME))
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((i) => i.user_id === ME)).toBe(true)
  })

  it('the same book cannot be saved twice (23505)', async () => {
    const res = await run(db.addToLibrary(ME, { volume_id: CATALOG[31].id, title: 't' }))
    expect(res.error.code).toBe('23505')
  })

  it('covers must be https', async () => {
    const res = await run(db.addToLibrary(ME, { volume_id: CATALOG[150].id, title: 't', thumbnail_url: 'http://x.dev/a.jpg' }))
    expect(res.error.code).toBe('23514')
  })

  it('only the owner can change a status, and only to a valid one', async () => {
    const othersItem = (await run(db.listLibrary(OTHER))).data[0]
    expect((await run(db.updateLibraryStatus(ME, othersItem.id, 'finished'))).data).toBeNull()
    const mine = await myItemFor(3)
    expect((await run(db.updateLibraryStatus(ME, mine.id, 'abandoned'))).error.code).toBe('23514')
    expect((await run(db.updateLibraryStatus(ME, mine.id, 'reading'))).data.status).toBe('reading')
  })

  it('removing a book deletes its logs too (ON DELETE CASCADE)', async () => {
    const item = await myItemFor(0)
    expect((await run(db.countLogsForItem(ME, item.id))).data).toBeGreaterThan(0)
    await run(db.removeFromLibrary(ME, item.id))
    const logs = (await run(db.listLogsForVolume(CATALOG[0].id))).data
    expect(logs.some((l) => l.library_item_id === item.id)).toBe(false)
  })
})

describe('logs (public to read, written by their author)', () => {
  it('shows display names and never emails', async () => {
    const { data } = await run(db.listLogsForVolume(CATALOG[31].id))
    expect(data.length).toBeGreaterThan(0)
    expect(data[0].profiles.display_name).toBeTruthy()
    expect(JSON.stringify(data)).not.toContain('@')
  })

  it('needs the book in the author’s own library (composite FK, 23503)', async () => {
    const othersItem = (await run(db.listLibrary(OTHER))).data[0]
    const onOthersItem = await run(db.addLog(ME, { library_item_id: othersItem.id, volume_id: othersItem.volume_id, body: 'x' }))
    expect(onOthersItem.error.code).toBe('23503')

    const mine = await myItemFor(31)
    const wrongBook = await run(db.addLog(ME, { library_item_id: mine.id, volume_id: CATALOG[0].id, body: 'x' }))
    expect(wrongBook.error.code).toBe('23503')
  })

  it('checks the body and rating (23514)', async () => {
    const mine = await myItemFor(31)
    const base = { library_item_id: mine.id, volume_id: mine.volume_id }
    expect((await run(db.addLog(ME, { ...base, body: '   ' }))).error.code).toBe('23514')
    expect((await run(db.addLog(ME, { ...base, body: 'x'.repeat(5001) }))).error.code).toBe('23514')
    expect((await run(db.addLog(ME, { ...base, body: 'ok', rating: 6 }))).error.code).toBe('23514')
    expect((await run(db.addLog(ME, { ...base, body: 'ok', rating: 2.5 }))).error.code).toBe('23514')
  })

  it('guests cannot write logs (42501)', async () => {
    const mine = await myItemFor(31)
    expect((await run(db.addLog(null, { library_item_id: mine.id, volume_id: mine.volume_id, body: 'x' }))).error.code).toBe('42501')
  })

  it('a reader cannot edit or delete someone else’s log', async () => {
    const othersLog = (await run(db.listLogsForVolume(CATALOG[0].id))).data.find((l) => l.user_id === OTHER)
    expect((await run(db.updateLog(ME, othersLog.id, { body: 'hacked' }))).data).toBeNull()
    expect((await run(db.deleteLog(ME, othersLog.id))).data).toBeNull()
    const after = (await run(db.listLogsForVolume(CATALOG[0].id))).data.find((l) => l.id === othersLog.id)
    expect(after.body).toBe(othersLog.body)
  })

  it('an author can post, edit and delete their own log', async () => {
    const mine = await myItemFor(31)
    const posted = (await run(db.addLog(ME, { library_item_id: mine.id, volume_id: mine.volume_id, body: '  Loved it  ', rating: 5 }))).data
    expect(posted.body).toBe('Loved it')
    const edited = (await run(db.updateLog(ME, posted.id, { body: 'Still love it', rating: 4 }))).data
    expect(edited).toMatchObject({ body: 'Still love it', rating: 4 })
    expect((await run(db.deleteLog(ME, posted.id))).data.id).toBe(posted.id)
  })
})

describe('profiles', () => {
  it('display names are unique, ignoring case', () => {
    expect(db.isDisplayNameTaken('booklover42')).toBe(true)
    expect(() => db.createProfileForUser({ id: 'u-new', user_metadata: { display_name: 'PAGETURNER' } })).toThrow(/unique/)
  })

  it('display names must be 2 to 30 characters', () => {
    expect(() => db.createProfileForUser({ id: 'u-short', user_metadata: { display_name: 'A' } })).toThrow(/check/)
  })

  it('a reader can update only their own profile, with a known theme', () => {
    expect(db.updateProfile(ME, OTHER, { theme: 'neon-arcade' }).data).toBeNull()
    expect(db.updateProfile(ME, ME, { theme: 'not-a-mode' }).error.code).toBe('23514')
    expect(db.updateProfile(ME, ME, { theme: 'kid-korner' }).data.theme).toBe('kid-korner')
  })

  it('renaming to a name someone else has fails, but changing your own name’s case works', () => {
    expect(db.updateProfile(ME, ME, { display_name: 'quietreader' }).error.code).toBe('23505')
    expect(db.updateProfile(ME, ME, { display_name: 'BOOKLOVER42' }).data.display_name).toBe('BOOKLOVER42')
  })
})
