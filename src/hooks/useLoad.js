import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs `load()` (which resolves to `{ data, error }`) whenever `key` changes and
 * tracks loading / ready / error. Mount with a React `key` for a fresh start.
 */
export function useLoad(load, key) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)
  // Local edits (setData) made while a load is in flight; replayed onto its result,
  // so a slower, older snapshot can't wipe out something the user just saved
  const pending = useRef([])
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let active = true
    pending.current = []
    loadRef
      .current()
      .then(({ data, error }) => {
        if (!active) return
        const edits = pending.current
        pending.current = null
        setState(error ? { status: 'error', data: null, error } : { status: 'ready', data: edits.reduce((d, edit) => edit(d), data), error: null })
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
  const setData = useCallback((update) => {
    const edit = typeof update === 'function' ? update : () => update
    pending.current?.push(edit) // still loading: remember it for the result
    setState((s) => ({ ...s, data: edit(s.data) }))
  }, [])

  return { ...state, reload, setData }
}
