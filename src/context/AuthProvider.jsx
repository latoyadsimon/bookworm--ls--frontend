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
    const { data } = auth.onAuthStateChange(async (event, session) => {
      const profile = session ? (await getProfile(session.user.id)).data : null
      if (!active) return
      // A reader's saved style mode wins when they log in
      if (event === 'SIGNED_IN' && profile && findMode(profile.theme)) setMode(profile.theme)
      setState({ ready: true, session, profile })
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
