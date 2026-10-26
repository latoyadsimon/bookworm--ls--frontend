import { useId, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import Icon from './Icon'
import { SEARCH_TYPES, normalizeType, validateSearch } from '../lib/searchValidation'

// Search box + type dropdown. Pre-fills from the URL while on /search.
export default function SearchBar({ className = '', autoFocus = false, onSearched }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const onSearchPage = pathname === '/search'
  const [query, setQuery] = useState(onSearchPage ? (params.get('q') ?? '') : '')
  const [type, setType] = useState(onSearchPage ? normalizeType(params.get('type')) : 'all')
  const [error, setError] = useState(null)
  const id = useId()

  function handleSubmit(e) {
    e.preventDefault()
    const problem = validateSearch(query, type)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    if (type === 'featured' && !query.trim()) navigate('/featured')
    else navigate(`/search?${new URLSearchParams({ q: query.trim(), type })}`)
    onSearched?.()
  }

  return (
    <form role="search" className={`search ${className}`} onSubmit={handleSubmit} noValidate>
      <div className="search-row">
        <label htmlFor={`${id}-q`} className="visually-hidden">
          Search books
        </label>
        <Icon name="search" size={18} className="search-icon" />
        <input
          id={`${id}-q`}
          className="search-input"
          type="search"
          placeholder="Search books…"
          value={query}
          maxLength={260}
          autoFocus={autoFocus}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => {
            setQuery(e.target.value)
            if (error) setError(null)
          }}
        />
        <label htmlFor={`${id}-type`} className="visually-hidden">
          Search by
        </label>
        <select
          id={`${id}-type`}
          className="search-type"
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            if (error) setError(null)
          }}
        >
          {SEARCH_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button type="submit" className="search-submit" aria-label="Search">
          <Icon name="search" size={18} />
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} className="search-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
