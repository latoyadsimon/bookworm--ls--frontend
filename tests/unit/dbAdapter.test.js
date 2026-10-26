import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as db from '../../src/services/db'
import { calls, queueResult, resetMock, stepsOf } from './supabaseMock'

vi.mock('../../src/lib/supabase.js', async () => (await import('./supabaseMock.js')).mockModule)

// Every reader goes through supabase-js; RLS enforces ownership, and the user_id filters state the intent.
const ME = '00000000-0000-4000-a000-000000000001'
const last = () => calls.at(-1)

beforeEach(resetMock)

describe('library_items', () => {
  it('lists only the reader’s items, newest first, with an optional status', async () => {
    queueResult({ data: [{ id: 'i1' }], error: null })
    expect((await db.listLibrary(ME, { status: 'reading' })).data).toEqual([{ id: 'i1' }])
    expect(last().table).toBe('library_items')
    expect(stepsOf(last())).toEqual(['select(*)', `eq(user_id,${ME})`, 'eq(status,reading)', 'order(created_at,{"ascending":false})'])
  })

  it('looks up one item by user and volume', async () => {
    await db.getLibraryItem(ME, 'vol1')
    expect(stepsOf(last())).toEqual(['select(*)', `eq(user_id,${ME})`, 'eq(volume_id,vol1)', 'maybeSingle()'])
  })

  it('inserts without a user_id: the database fills it from the signed-in reader', async () => {
    await db.addToLibrary(ME, { volume_id: 'v', title: 't' })
    const [, [row]] = last().steps[0]
    expect(row).toEqual({ volume_id: 'v', title: 't', authors: [], thumbnail_url: null })
  })

  it('scopes status updates and deletes by id and user_id', async () => {
    await db.updateLibraryStatus(ME, 'i1', 'finished')
    expect(stepsOf(last())).toEqual(['update({"status":"finished"})', 'eq(id,i1)', `eq(user_id,${ME})`, 'select()', 'maybeSingle()'])
    await db.removeFromLibrary(ME, 'i1')
    expect(stepsOf(last())).toEqual(['delete()', 'eq(id,i1)', `eq(user_id,${ME})`, 'select()', 'maybeSingle()'])
  })

  it('passes Postgres error codes through', async () => {
    queueResult({ data: null, error: { code: '23505', message: 'dup' } })
    expect((await db.addToLibrary(ME, { volume_id: 'v', title: 't' })).error.code).toBe('23505')
  })

  it('reports a failed network call like the mock does', async () => {
    queueResult({ data: null, error: { message: 'TypeError: Failed to fetch' } })
    expect((await db.listLibrary(ME)).error.code).toBe('NETWORK')
  })

  it('counts a reader’s logs for an item', async () => {
    queueResult({ data: null, count: 3, error: null })
    expect((await db.countLogsForItem(ME, 'i1')).data).toBe(3)
    expect(stepsOf(last())).toEqual(['select(id,{"count":"exact","head":true})', 'eq(library_item_id,i1)', `eq(user_id,${ME})`])
  })
})

describe('logs', () => {
  it('reads every reader’s logs for a book with display names', async () => {
    queueResult({ data: [{ id: 'l1', created_at: '2026-01-01', profiles: { display_name: 'A' } }], error: null })
    const { data } = await db.listLogsForVolume('v')
    expect(data).toHaveLength(1)
    expect(stepsOf(calls[0])).toEqual(['select(*, profiles(display_name))', 'eq(volume_id,v)', 'order(created_at,{"ascending":false})'])
  })

  it('inserts the library item without a user_id (the database fills it from the session)', async () => {
    await db.addLog(ME, { library_item_id: 'i1', volume_id: 'v', body: '  hi ', rating: 4 })
    expect(last().steps[0][1][0]).toEqual({ library_item_id: 'i1', volume_id: 'v', body: 'hi', rating: 4 })
  })

  it('scopes log edits and deletes by id and user_id', async () => {
    await db.updateLog(ME, 'l1', { body: 'x', rating: 2 })
    expect(stepsOf(last()).slice(0, 3)).toEqual(['update({"body":"x","rating":2})', 'eq(id,l1)', `eq(user_id,${ME})`])
    await db.deleteLog(ME, 'l1')
    expect(stepsOf(last()).slice(0, 3)).toEqual(['delete()', 'eq(id,l1)', `eq(user_id,${ME})`])
  })
})

describe('profiles', () => {
  it('reads and updates the reader’s own profile row', async () => {
    queueResult({ data: { id: ME, theme: 'neon-arcade' }, error: null })
    expect((await db.getProfile(ME)).data.theme).toBe('neon-arcade')
    await db.updateProfile(ME, ME, { theme: 'kid-korner' })
    expect(stepsOf(last())).toEqual(['update({"theme":"kid-korner"})', `eq(id,${ME})`, 'select()', 'maybeSingle()'])
  })

  it('refuses to touch another reader’s profile', async () => {
    const before = calls.length
    expect((await db.updateProfile(ME, '00000000-0000-4000-a000-000000000002', { theme: 'x' })).data).toBeNull()
    expect(calls.length).toBe(before)
  })

  it('checks display names case-insensitively against saved profiles', async () => {
    queueResult({ data: [{ id: ME }], error: null })
    expect(await db.isDisplayNameTaken('booklover42')).toBe(true)
    expect(stepsOf(last())[1]).toBe('ilike(display_name,booklover42)')
    expect(await db.isDisplayNameTaken('Brand New')).toBe(false)
  })
})

describe('guests', () => {
  it('a guest has no library item, and the database is not asked', async () => {
    expect(await db.getLibraryItem(undefined, 'v')).toEqual({ data: null, error: null })
    expect(calls).toHaveLength(0)
  })
})
