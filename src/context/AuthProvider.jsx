import { useCallback, useEffect, useMemo, useState } from 'react'
import { auth } from '../services/auth'
import { getProfile, updateProfile } from '../services/db'
import { findMode } from '../theme/modes'
import { AuthContext } from './auth-context'
import { useTheme } from './theme-context'

export function AuthProvider({ children }) {
  const { setMode } = useTheme()
  const [state, setState] = useState({ ready: false, session: null, profile: null })

  useEffect(() => {
    let active = true
    let loadedFor = null // the user whose profile is in state
    const { data } = auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id ?? null
      // A token refresh keeps the same reader: just swap the session
      if (userId && userId === loadedFor && event !== 'SIGNED_IN') {
        setState((s) => ({ ...s, session }))
        return
      }
      // Deferred: awaiting another Supabase call inside this callback can deadlock supabase-js's auth lock
      setTimeout(async () => {
        const profile = userId ? (await getProfile(userId)).data : null
        if (!active) return
        loadedFor = userId
        // A reader's saved style mode wins when they log in
        if (event === 'SIGNED_IN' && profile && findMode(profile.theme)) setMode(profile.theme)
        setState({ ready: true, session, profile })
      }, 0)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [setMode])

  const user = state.session?.user ?? null

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await auth.signInWithPassword({ email: email.trim(), password })
    return { error }
  }, [])

  const signUp = useCallback(async ({ email, password, displayName }) => {
    const { error } = await auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await auth.signOut()
  }, [])

  // Saves a picked style mode to the reader's profile (guests keep it in the browser only)
  const saveTheme = useCallback(
    async (theme) => {
      if (!user) return
      const { data } = await updateProfile(user.id, user.id, { theme })
      if (data) setState((s) => ({ ...s, profile: data }))
    },
    [user],
  )

  const value = useMemo(
    () => ({ ready: state.ready, user, profile: state.profile, signIn, signUp, signOut, saveTheme }),
    [state.ready, state.profile, user, signIn, signUp, signOut, saveTheme],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
