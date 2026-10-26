// In-memory stand-in for `supabase.auth`. Same method names, return shapes
// and error codes as supabase-js v2, so swapping in the real client later only
// changes this file. Sessions live in memory: a refresh logs you out (by design,
// the app does not use Supabase Auth). Seed readers carry their real profile ids.
//
// ?simulate=429 forces a rate-limit error, ?simulate=offline a network failure.

import { SEED_USERS } from './mock/seed'
import { createProfileForUser, isDisplayNameTaken } from './db'

const users = new Map(SEED_USERS.map((u) => [u.email, {
  id: u.id,
  email: u.email,
  password: u.password,
  user_metadata: { display_name: u.display_name },
  created_at: new Date().toISOString(),
}]))

let session = null
const listeners = new Set()
const failedLogins = new Map() // email -> timestamps of recent failures

const MIN_PASSWORD = 6
const MAX_FAILS_PER_MINUTE = 5

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const authError = (message, code, status) => ({ name: 'AuthApiError', message, code, status })
const publicUser = ({ password: _password, ...user }) => ({ ...user })

function simulate() {
  try {
    return new URLSearchParams(window.location.search).get('simulate')
  } catch {
    return null
  }
}

async function network() {
  await delay(450 + Math.random() * 300)
  const mode = simulate()
  if (mode === 'offline') return { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 }
  if (mode === '429') return authError('Request rate limit reached', 'over_request_rate_limit', 429)
  return null
}

function emit(event) {
  for (const cb of listeners) cb(event, session)
}

function startSession(user) {
  session = { access_token: `mock-${crypto.randomUUID()}`, token_type: 'bearer', user: publicUser(user) }
  emit('SIGNED_IN')
  return session
}

export const auth = {
  async signUp({ email, password, options }) {
    const netError = await network()
    if (netError) return { data: { user: null, session: null }, error: netError }
    const key = String(email ?? '').trim().toLowerCase()
    if (!key) return { data: { user: null, session: null }, error: authError('Anonymous sign-ins are disabled', 'validation_failed', 400) }
    if (String(password ?? '').length < MIN_PASSWORD) {
      return { data: { user: null, session: null }, error: authError(`Password should be at least ${MIN_PASSWORD} characters.`, 'weak_password', 422) }
    }
    if (users.has(key)) {
      return { data: { user: null, session: null }, error: authError('User already registered', 'user_already_exists', 422) }
    }
    const user = {
      id: crypto.randomUUID(),
      email: key,
      password,
      user_metadata: { ...(options?.data ?? {}) },
      created_at: new Date().toISOString(),
    }
    // The profile trigger runs inside the same transaction: if it fails, no user is created.
    // Display names are unique across the saved readers too, so check them as well.
    try {
      if (await isDisplayNameTaken(String(user.user_metadata.display_name ?? ''))) throw new Error('duplicate display name')
      createProfileForUser(user)
    } catch {
      return { data: { user: null, session: null }, error: authError('Database error saving new user', 'unexpected_failure', 500) }
    }
    users.set(key, user)
    // "Confirm email" is off, so sign-up returns a session right away
    const s = startSession(user)
    return { data: { user: s.user, session: s }, error: null }
  },

  async signInWithPassword({ email, password }) {
    const netError = await network()
    if (netError) return { data: { user: null, session: null }, error: netError }
    const key = String(email ?? '').trim().toLowerCase()
    const recent = (failedLogins.get(key) ?? []).filter((t) => Date.now() - t < 60_000)
    if (recent.length >= MAX_FAILS_PER_MINUTE) {
      return { data: { user: null, session: null }, error: authError('Request rate limit reached', 'over_request_rate_limit', 429) }
    }
    const user = users.get(key)
    if (!user || user.password !== password) {
      failedLogins.set(key, [...recent, Date.now()])
      // Same error for unknown email and wrong password, exactly like Supabase
      return { data: { user: null, session: null }, error: authError('Invalid login credentials', 'invalid_credentials', 400) }
    }
    failedLogins.delete(key)
    const s = startSession(user)
    return { data: { user: s.user, session: s }, error: null }
  },

  async signOut() {
    await delay(150)
    session = null
    emit('SIGNED_OUT')
    return { error: null }
  },

  async getSession() {
    return { data: { session }, error: null }
  },

  onAuthStateChange(callback) {
    listeners.add(callback)
    queueMicrotask(() => callback('INITIAL_SESSION', session))
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }
  },
}
