import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queueResult, resetMock } from './supabaseMock'

vi.mock('../../src/lib/supabase.js', async () => (await import('./supabaseMock.js')).mockModule)
import { auth } from '../../src/services/auth'
import { getProfile } from '../../src/services/db'
import { DEMO_LOGIN } from '../../src/services/mock/seed'
import { run } from './helpers'

// The mock follows supabase-js v2: same methods, `{ data, error }` shapes and error codes.
beforeEach(() => {
  resetMock()
  vi.useFakeTimers()
})
afterEach(async () => {
  await run(auth.signOut())
  vi.useRealTimers()
})

const signIn = (email, password) => run(auth.signInWithPassword({ email, password }))
const signUp = (email, password, display_name) => run(auth.signUp({ email, password, options: { data: { display_name } } }))

describe('signInWithPassword', () => {
  it('logs in the demo reader and never returns the password', async () => {
    const { data, error } = await signIn(DEMO_LOGIN.email, DEMO_LOGIN.password)
    expect(error).toBeNull()
    expect(data.session.user.email).toBe(DEMO_LOGIN.email)
    expect(data.user).not.toHaveProperty('password')
  })

  it('ignores case and spaces in the email', async () => {
    const { error } = await signIn('  DEMO@bookworm.dev ', DEMO_LOGIN.password)
    expect(error).toBeNull()
  })

  it('gives the same error for a wrong password and an unknown email', async () => {
    expect((await signIn(DEMO_LOGIN.email, 'nope')).error.code).toBe('invalid_credentials')
    expect((await signIn('nobody@example.com', 'nope')).error.code).toBe('invalid_credentials')
  })

  it('locks an email for a minute after 5 failed tries', async () => {
    const email = 'pageturner@example.com'
    for (let i = 0; i < 5; i++) await signIn(email, 'wrong')
    // Even the right password is refused while locked
    expect((await signIn(email, 'pageturner1')).error).toMatchObject({ code: 'over_request_rate_limit', status: 429 })
    await vi.advanceTimersByTimeAsync(61_000)
    expect((await signIn(email, 'pageturner1')).error).toBeNull()
  })
})

describe('signUp', () => {
  it('creates the account, the profile and a session (email confirmation is off)', async () => {
    const { data, error } = await signUp('Fresh@Reader.dev', 'secret12', 'Fresh Reader')
    expect(error).toBeNull()
    expect(data.session.user.email).toBe('fresh@reader.dev')
    expect((await run(getProfile(data.user.id))).data.display_name).toBe('Fresh Reader')
  })

  it('rejects short passwords and existing emails', async () => {
    expect((await signUp('a@reader.dev', 'abc', 'Short Pw')).error.code).toBe('weak_password')
    expect((await signUp('PageTurner@example.com', 'secret12', 'New Name')).error.code).toBe('user_already_exists')
  })

  it('creates nothing when the display name is taken (the profile trigger aborts sign-up)', async () => {
    queueResult({ data: [{ id: '00000000-0000-4000-a000-000000000001' }], error: null }) // the saved BookLover42 profile
    expect((await signUp('taken@reader.dev', 'secret12', 'booklover42')).error.code).toBe('unexpected_failure')
    expect((await signIn('taken@reader.dev', 'secret12')).error.code).toBe('invalid_credentials')
  })
})

describe('onAuthStateChange', () => {
  it('reports the initial session, then sign-in and sign-out', async () => {
    const events = []
    const { data } = auth.onAuthStateChange((event) => events.push(event))
    await signIn(DEMO_LOGIN.email, DEMO_LOGIN.password)
    await run(auth.signOut())
    data.subscription.unsubscribe()
    expect(events).toEqual(['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT'])
  })
})
