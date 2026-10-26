// Supabase Auth (email + password). supabase-js keeps the session in
// localStorage and refreshes its token, so a refresh or deep link stays signed in.
// Sign-up creates the profile in the database (trigger on_auth_user_created).
//
// ?simulate=429 forces a rate-limit error, ?simulate=offline a network failure,
// with the same error shapes supabase-js returns.

import { supabase } from '../lib/supabase'

const authError = (message, code, status) => ({ name: 'AuthApiError', message, code, status })
const noUser = (error) => ({ data: { user: null, session: null }, error })

function simulated() {
  let mode = null
  try {
    mode = new URLSearchParams(window.location.search).get('simulate')
  } catch {
    return null
  }
  if (mode === 'offline') return { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 }
  if (mode === '429') return authError('Request rate limit reached', 'over_request_rate_limit', 429)
  return null
}

export const auth = {
  async signUp(credentials) {
    const forced = simulated()
    return forced ? noUser(forced) : supabase.auth.signUp(credentials)
  },

  async signInWithPassword(credentials) {
    const forced = simulated()
    return forced ? noUser(forced) : supabase.auth.signInWithPassword(credentials)
  },

  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),
}
