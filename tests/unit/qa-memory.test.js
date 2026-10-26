// QA audit: memoryDb rules (the checklist for the real schema).
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as mem from './support/memoryDb'
import { run } from './helpers'

const A = 'qa-user-a'
const B = 'qa-user-b'

beforeAll(() => {
  mem.createProfileForUser({ id: A, user_metadata: { display_name: 'QaAlpha' } })
  mem.createProfileForUser({ id: B, user_metadata: { display_name: 'QaBeta' } })
})
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const add = async (user, volume_id, extra = {}) => (await run(mem.addToLibrary(user, { volume_id, title: volume_id, ...extra }))).data
const log = (user, item, body = 'ok', rating = null) =>
  run(mem.addLog(user, { library_item_id: item.id, volume_id: item.volume_id, body, rating }))

describe('memoryDb: library_items', () => {
  it('a duplicate add fails with 23505, but the book can be saved again after removal', async () => {
    const item = await add(A, 'dup-1')
    expect((await run(mem.addToLibrary(A, { volume_id: 'dup-1', title: 'x' }))).error.code).toBe('23505')
    await run(mem.removeFromLibrary(A, item.id))
    expect((await run(mem.addToLibrary(A, { volume_id: 'dup-1', title: 'x' }))).error).toBeNull()
  })

  it('two readers can save the same book independently', async () => {
    await add(A, 'shared-1')
    expect((await run(mem.addToLibrary(B, { volume_id: 'shared-1', title: 'x' }))).error).toBeNull()
  })

  it('rejects a volume id over 64 characters and an empty title (23514)', async () => {
    expect((await run(mem.addToLibrary(A, { volume_id: 'v'.repeat(65), title: 't' }))).error.code).toBe('23514')
    expect((await run(mem.addToLibrary(A, { volume_id: 'ok-vol', title: '' }))).error.code).toBe('23514')
  })

  // Regression (QA bug fixed 2026-10-26): memoryDb.addToLibrary only checks `!title`; the live schema has
  // library_items_title_length CHECK (char_length(title) between 1 and 500), so a
  // session reader can save a 501-char title that a seed reader could not.
  it('rejects a title over 500 characters, like the live CHECK constraint', async () => {
    expect((await run(mem.addToLibrary(A, { volume_id: 'long-title', title: 't'.repeat(501) }))).error?.code).toBe('23514')
  })

  it('a guest or another reader cannot change or remove an item (0 rows), and it is untouched', async () => {
    const item = await add(A, 'priv-1')
    expect(await run(mem.updateLibraryStatus(null, item.id, 'finished'))).toEqual({ data: null, error: null })
    expect(await run(mem.updateLibraryStatus(B, item.id, 'finished'))).toEqual({ data: null, error: null })
    expect(await run(mem.removeFromLibrary(B, item.id))).toEqual({ data: null, error: null })
    expect((await run(mem.getLibraryItem(A, 'priv-1'))).data.status).toBe('want_to_read')
    expect((await run(mem.getLibraryItem(B, 'priv-1'))).data).toBeNull()
  })

  it('rejects unknown statuses, including case variants', async () => {
    const item = await add(A, 'status-1')
    for (const s of ['Reading', 'done', '', null]) {
      expect((await run(mem.updateLibraryStatus(A, item.id, s))).error.code).toBe('23514')
    }
  })
})

describe('memoryDb: logs', () => {
  it('body length boundaries: 1 and 5000 pass (after trimming), 0 and 5001 fail', async () => {
    const item = await add(A, 'body-1')
    expect((await log(A, item, 'x')).error).toBeNull()
    expect((await log(A, item, 'y'.repeat(5000))).error).toBeNull()
    const padded = await log(A, item, `   ${'z'.repeat(5000)}   `)
    expect(padded.error).toBeNull()
    expect(padded.data.body).toHaveLength(5000)
    expect((await log(A, item, 'y'.repeat(5001))).error.code).toBe('23514')
    expect((await log(A, item, ' \n\t ')).error.code).toBe('23514')
    expect((await log(A, item, null)).error.code).toBe('23514')
  })

  it.each([0, 6, 2.5, '3', -1, NaN])('rejects rating %o', async (rating) => {
    const item = (await run(mem.getLibraryItem(A, 'rating-1'))).data ?? (await add(A, 'rating-1'))
    expect((await log(A, item, 'ok', rating)).error.code).toBe('23514')
  })

  it('accepts ratings 1 and 5 and a cleared (null/undefined) rating', async () => {
    const item = await add(A, 'rating-2')
    expect((await log(A, item, 'ok', 1)).data.rating).toBe(1)
    expect((await log(A, item, 'ok', 5)).data.rating).toBe(5)
    expect((await log(A, item, 'ok', undefined)).data.rating).toBeNull()
  })

  it('composite FK: someone else’s item, or my item with another volume, fails 23503', async () => {
    const mine = await add(A, 'fk-1')
    const theirs = await add(B, 'fk-1')
    expect((await run(mem.addLog(A, { library_item_id: theirs.id, volume_id: 'fk-1', body: 'x' }))).error.code).toBe('23503')
    expect((await run(mem.addLog(A, { library_item_id: mine.id, volume_id: 'fk-OTHER', body: 'x' }))).error.code).toBe('23503')
    expect((await run(mem.addLog(A, { library_item_id: 'no-such-item', volume_id: 'fk-1', body: 'x' }))).error.code).toBe('23503')
  })

  it('cascade removes only the removed item’s logs', async () => {
    const one = await add(A, 'cas-1')
    const two = await add(A, 'cas-2')
    const theirs = await add(B, 'cas-1')
    await log(A, one, 'a1')
    await log(A, two, 'a2')
    await log(B, theirs, 'b1')
    await run(mem.removeFromLibrary(A, one.id))
    expect((await run(mem.listLogsForVolume('cas-1'))).data.map((l) => l.body)).toEqual(['b1'])
    expect((await run(mem.listLogsForVolume('cas-2'))).data.map((l) => l.body)).toEqual(['a2'])
    expect((await run(mem.countLogsForItem(A, one.id))).data).toBe(0)
  })

  it('another reader cannot edit or delete my log, and cannot count my logs', async () => {
    const item = await add(A, 'own-1')
    const mine = (await log(A, item, 'mine')).data
    expect(await run(mem.updateLog(B, mine.id, { body: 'pwned' }))).toEqual({ data: null, error: null })
    expect(await run(mem.deleteLog(B, mine.id))).toEqual({ data: null, error: null })
    expect((await run(mem.countLogsForItem(B, item.id))).data).toBe(0)
    expect((await run(mem.listLogsForVolume('own-1'))).data[0].body).toBe('mine')
  })

  it('edits keep the same validation as inserts', async () => {
    const item = await add(A, 'edit-1')
    const mine = (await log(A, item, 'first')).data
    expect((await run(mem.updateLog(A, mine.id, { body: '   ' }))).error.code).toBe('23514')
    expect((await run(mem.updateLog(A, mine.id, { body: 'x'.repeat(5001) }))).error.code).toBe('23514')
    const edited = (await run(mem.updateLog(A, mine.id, { body: ' second ', rating: 3 }))).data
    expect(edited).toMatchObject({ body: 'second', rating: 3, user_id: A, library_item_id: item.id })
  })

  it('log rows expose display names, never emails or other profile fields', async () => {
    const item = await add(A, 'name-1')
    const row = (await log(A, item)).data
    expect(row.profiles).toEqual({ display_name: 'QaAlpha' })
  })
})

describe('memoryDb: profiles', () => {
  it('display-name uniqueness ignores case and surrounding spaces', () => {
    expect(mem.isDisplayNameTaken('  qaalpha ')).toBe(true)
    expect(() => mem.createProfileForUser({ id: 'qa-x', user_metadata: { display_name: ' QAALPHA ' } })).toThrow(/duplicate/)
  })

  it('display names must be 2 to 30 characters after trimming', () => {
    expect(() => mem.createProfileForUser({ id: 'qa-y', user_metadata: { display_name: '  a  ' } })).toThrow(/check/)
    expect(() => mem.createProfileForUser({ id: 'qa-y', user_metadata: { display_name: 'n'.repeat(31) } })).toThrow(/check/)
    expect(mem.createProfileForUser({ id: 'qa-y', user_metadata: { display_name: 'n'.repeat(30) } }).display_name).toHaveLength(30)
  })

  it('rejects an unknown theme and an over-long rename', () => {
    expect(mem.updateProfile(A, A, { theme: 'hacker-green' }).error.code).toBe('23514')
    expect(mem.updateProfile(A, A, { display_name: 'x'.repeat(31) }).error.code).toBe('23514')
    expect(mem.updateProfile(A, A, { display_name: 'qabeta' }).error.code).toBe('23505')
  })
})
