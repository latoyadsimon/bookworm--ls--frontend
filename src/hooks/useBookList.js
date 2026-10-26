import { useCallback, useEffect, useRef, useState } from 'react'
import { getBooks } from '../services/booksApi'

// Remembers loaded pages per query so Back/Forward shows the same books
// instantly (in memory only, cleared on refresh).
const cache = new Map()

const INITIAL = { status: 'loading', items: [], nextPage: null, total: 0, error: null, loadingMore: false, moreError: null }

/**
 * Paged list of books for one query. Mount it with `key={queryKey}` so a new
 * query starts fresh.
 */
export function useBookList(params) {
  const key = JSON.stringify(params)
  const [state, setState] = useState(() => cache.get(key) ?? INITIAL)
  const [attempt, setAttempt] = useState(0)
  const moreController = useRef(null)

  useEffect(() => {
    if (attempt === 0 && cache.has(key)) return
    const query = JSON.parse(key)
    const controller = new AbortController()
    getBooks({ ...query, page: 0, signal: controller.signal })
      .then((res) => {
        const next = { ...INITIAL, status: 'ready', items: res.items, nextPage: res.nextPage, total: res.totalItems }
        cache.set(key, next)
        setState(next)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ ...INITIAL, status: 'error', error })
      })
    return () => controller.abort()
  }, [key, attempt])

  useEffect(() => () => moreController.current?.abort(), [])

  const retry = useCallback(() => {
    setState(INITIAL)
    setAttempt((n) => n + 1)
  }, [])

  const loadMore = useCallback(() => {
    if (state.loadingMore || state.nextPage == null) return
    const controller = new AbortController()
    moreController.current = controller
    setState((s) => ({ ...s, loadingMore: true, moreError: null }))
    getBooks({ ...JSON.parse(key), page: state.nextPage, signal: controller.signal })
      .then((res) => {
        setState((s) => {
          const seen = new Set(s.items.map((b) => b.id))
          const next = {
            ...s,
            loadingMore: false,
            items: [...s.items, ...res.items.filter((b) => !seen.has(b.id))],
            nextPage: res.nextPage,
            total: res.totalItems,
          }
          cache.set(key, next)
          return next
        })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState((s) => ({ ...s, loadingMore: false, moreError: error }))
      })
  }, [key, state.loadingMore, state.nextPage])

  return { ...state, retry, loadMore }
}
