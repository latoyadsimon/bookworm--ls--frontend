// QA audit: memoryDb rules (the checklist for the real schema) and the auth mock.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { queueResult, resetMock } from './supabaseMock'

vi.mock('../../src/lib/supabase.js', async () => (await import('./supabaseMock.js')).mockModule)
import * as mem from '../../src/services/mock/memoryDb'
import { auth } from '../../src/services/auth'
import { run } from './helpers'

const A = 'qa-user-a'
const B = 'qa-user-b'

beforeAll(() => {
  mem.createProfileForUser({ id: A, user_metadata: { display_name: 'QaAlpha' } })
  mem.createProfileForUser({ id: B, user_metadata: { display_name: 'QaBeta' } })
})
beforeEach(() => {
  resetMock()
  vi.useFakeTimers()
})
afterEach(async () => {
  await run(auth.signOut())
  vi.useRealTimers()
})

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

  // QA-BUG: memoryDb.addToLibrary only checks `!title`; the live schema has
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

describe('auth mock', () => {
  const signIn = (email, password) => run(auth.signInWithPassword({ email, password }))
  const signUp = (email, password, display_name) => run(auth.signUp({ email, password, options: { data: { display_name } } }))

  it('treats a different-case copy of an existing email as already registered', async () => {
    expect((await signUp('  DEMO@BookWorm.DEV ', 'secret1', 'QaCaseOne')).error.code).toBe('user_already_exists')
  })

  it('stores new emails lower-case, so login works with any casing', async () => {
    expect((await signUp('QA.Mixed@Example.COM', 'secret1', 'QaMixed')).error).toBeNull()
    await run(auth.signOut())
    const { data, error } = await signIn('qa.mixed@example.com', 'secret1')
    expect(error).toBeNull()
    expect(data.user.email).toBe('qa.mixed@example.com')
    expect(data.user).not.toHaveProperty('password')
  })

  it('password length boundary: 5 fails, 6 passes', async () => {
    expect((await signUp('qa.five@example.com', '12345', 'QaFive')).error.code).toBe('weak_password')
    expect((await signUp('qa.six@example.com', '123456', 'QaSix')).error).toBeNull()
  })

  it('a display name taken by a saved reader in another case aborts sign-up and creates nothing', async () => {
    queueResult({ data: [{ id: 'seed' }], error: null }) // ilike match in profiles
    expect((await signUp('qa.taken@example.com', 'secret1', 'quietREADER')).error.code).toBe('unexpected_failure')
    expect((await signIn('qa.taken@example.com', 'secret1')).error.code).toBe('invalid_credentials')
  })

  it('the lockout blocks even the right password, then resets after a minute', async () => {
    const email = 'pageturner@example.com'
    for (let i = 0; i < 5; i++) expect((await signIn(email, 'wrong!')).error.code).toBe('invalid_credentials')
    expect((await signIn(email, 'pageturner1')).error.code).toBe('over_request_rate_limit')
    vi.advanceTimersByTime(61_000)
    expect((await signIn(email, 'pageturner1')).error).toBeNull()
  })

  it('a success clears the failure count', async () => {
    const email = 'neonnovelist@example.com'
    for (let i = 0; i < 4; i++) await signIn(email, 'wrong!')
    expect((await signIn(email, 'neonnovelist1')).error).toBeNull()
    await run(auth.signOut())
    for (let i = 0; i < 4; i++) expect((await signIn(email, 'wrong!')).error.code).toBe('invalid_credentials')
    expect((await signIn(email, 'neonnovelist1')).error).toBeNull()
  })

  it('locks per email: one locked address does not block another', async () => {
    for (let i = 0; i < 5; i++) await signIn('qa.locked@example.com', 'nope')
    expect((await signIn('qa.locked@example.com', 'nope')).error.code).toBe('over_request_rate_limit')
    expect((await signIn('quietreader@example.com', 'quietreader1')).error).toBeNull()
  })

  it('emits SIGNED_OUT and clears the session on sign-out', async () => {
    await signIn('quietreader@example.com', 'quietreader1')
    const events = []
    const { data } = auth.onAuthStateChange((e, s) => events.push([e, s?.user?.email ?? null]))
    await run(auth.signOut())
    data.subscription.unsubscribe()
    expect(events).toContainEqual(['SIGNED_OUT', null])
    expect((await auth.getSession()).data.session).toBeNull()
  })
})
