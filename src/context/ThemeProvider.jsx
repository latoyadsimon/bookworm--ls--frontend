import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_MODE, findMode } from '../theme/modes'
import { ThemeContext } from './theme-context'

const STORAGE_KEY = 'bookworm-theme'
const MOTION_KEY = 'bookworm-motion'

// Only preferences survive a refresh (style mode + background animation);
// all app data is in-memory by design.
function readSaved(key, isValid, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return isValid(saved) ? saved : fallback
  } catch {
    return fallback
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private windows can block storage; the preference still applies for this visit.
  }
}

function loadModeFonts(mode) {
  const id = 'mode-fonts'
  let link = document.getElementById(id)
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== mode.fonts) link.href = mode.fonts
}

const reducedMotionQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)')

export function ThemeProvider({ children }) {
  const [modeKey, setModeKey] = useState(() => readSaved(STORAGE_KEY, (v) => Boolean(findMode(v)), DEFAULT_MODE))
  const [motion, setMotionState] = useState(() => readSaved(MOTION_KEY, (v) => v === 'on' || v === 'off', 'on'))
  const [reducedMotion, setReducedMotion] = useState(() => reducedMotionQuery().matches)

  useEffect(() => {
    const mode = findMode(modeKey) ?? findMode(DEFAULT_MODE)
    document.documentElement.dataset.theme = mode.key
    loadModeFonts(mode)
    save(STORAGE_KEY, mode.key)
  }, [modeKey])

  // Background scenes: on/off switch, the device's reduce-motion setting, and hidden tabs
  useEffect(() => {
    document.documentElement.dataset.motion = motion
    save(MOTION_KEY, motion)
  }, [motion])

  useEffect(() => {
    const query = reducedMotionQuery()
    const onChange = (e) => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)
    const onVisibility = () => {
      if (document.hidden) document.documentElement.dataset.hidden = ''
      else delete document.documentElement.dataset.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      query.removeEventListener('change', onChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const setMode = useCallback((key) => {
    if (findMode(key)) setModeKey(key)
  }, [])
  const setMotion = useCallback((value) => setMotionState(value === 'off' ? 'off' : 'on'), [])

  const value = useMemo(
    () => ({ mode: modeKey, setMode, motion, setMotion, reducedMotion }),
    [modeKey, setMode, motion, setMotion, reducedMotion],
  )
  return <ThemeContext value={value}>{children}</ThemeContext>
}
