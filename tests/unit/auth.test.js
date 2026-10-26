import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi, resetMock } from './supabaseMock'

vi.mock('../../src/lib/supabase.js', async () => (await import('./supabaseMock.js')).mockModule)
import { auth } from '../../src/services/auth'

// auth.js is a thin wrapper over supabase.auth plus the ?simulate demo switches.
const credentials = { email: 'demo@bookworm.dev', password: 'password123' }
let search = ''

beforeEach(() => {
  resetMock()
  search = ''
  vi.stubGlobal('window', { location: { get search() { return search } } })
})

describe('pass-through to Supabase Auth', () => {
  it('signs in and signs up with supabase.auth, returning its result as is', async () => {
    const result = { data: { user: { id: 'u1' }, session: {} }, error: null }
    authApi.signInWithPassword.mockResolvedValue(result)
    expect(await auth.signInWithPassword(credentials)).toBe(result)
    expect(authApi.signInWithPassword).toHaveBeenCalledWith(credentials)

    const signUp = { ...credentials, options: { data: { display_name: 'Fresh Reader' } } }
    authApi.signUp.mockResolvedValue(result)
    expect(await auth.signUp(signUp)).toBe(result)
    expect(authApi.signUp).toHaveBeenCalledWith(signUp)
  })

  it('forwards sign-out, the session and the auth listener', () => {
    const callback = () => {}
    auth.signOut()
    auth.getSession()
    auth.onAuthStateChange(callback)
    expect(authApi.signOut).toHaveBeenCalled()
    expect(authApi.getSession).toHaveBeenCalled()
    expect(authApi.onAuthStateChange).toHaveBeenCalledWith(callback)
  })
})

describe('demo switches', () => {
  it('?simulate=429 returns a rate-limit error without calling Supabase', async () => {
    search = '?simulate=429'
    const { data, error } = await auth.signInWithPassword(credentials)
    expect(error).toMatchObject({ code: 'over_request_rate_limit', status: 429 })
    expect(data).toEqual({ user: null, session: null })
    expect(authApi.signInWithPassword).not.toHaveBeenCalled()
  })

  it('?simulate=offline returns a network failure for sign-up', async () => {
    search = '?simulate=offline'
    const { error } = await auth.signUp(credentials)
    expect(error).toMatchObject({ name: 'AuthRetryableFetchError', status: 0 })
    expect(authApi.signUp).not.toHaveBeenCalled()
  })
})
