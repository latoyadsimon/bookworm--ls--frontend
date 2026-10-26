import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs `load()` (which resolves to `{ data, error }`) whenever `key` changes and
 * tracks loading / ready / error. Mount with a React `key` for a fresh start.
 */
export function useLoad(load, key) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let active = true
    loadRef
      .current()
      .then(({ data, error }) => {
        if (active) setState(error ? { status: 'error', data: null, error } : { status: 'ready', data, error: null })
      })
      .catch((error) => active && setState({ status: 'error', data: null, error }))
    return () => {
      active = false
    }
  }, [key, attempt])

  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    setAttempt((n) => n + 1)
  }, [])

  // Update loaded data in place after a successful save (no refetch needed)
  const setData = useCallback(
    (update) => setState((s) => ({ ...s, data: typeof update === 'function' ? update(s.data) : update })),
    [],
  )

  return { ...state, reload, setData }
}
