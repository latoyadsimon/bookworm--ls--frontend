import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import CoverArt from '../components/CoverArt'
import StateMessage from '../components/StateMessage'
import StatusSelect from '../components/StatusSelect'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../context/auth-context'
import { useToast } from '../context/toast-context'
import { useTheme } from '../context/theme-context'
import { statusIcon } from '../theme/modes'
import { useLoad } from '../hooks/useLoad'
import { useSaveError } from '../hooks/useSaveError'
import * as db from '../services/db'
import { STATUS_LABELS, formatAuthors, formatDate, plural } from '../lib/format'
import './library.css'

const TABS = [{ key: 'all', label: 'All' }, ...Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label }))]

export default function LibraryPage() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const saveError = useSaveError()
  const { mode } = useTheme()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('status')) ? params.get('status') : 'all'

  const library = useLoad(() => db.listLibrary(user.id), user.id)
  const [rowState, setRowState] = useState({}) // id -> { saving, saved }
  const [removeDialog, setRemoveDialog] = useState({ item: null, count: null, busy: false })

  const items = library.data ?? []
  const counts = Object.fromEntries(TABS.map((t) => [t.key, t.key === 'all' ? items.length : items.filter((i) => i.status === t.key).length]))
  const visible = tab === 'all' ? items : items.filter((i) => i.status === tab)

  async function handleStatus(entry, status) {
    library.setData((list) => list.map((i) => (i.id === entry.id ? { ...i, status } : i))) // optimistic
    setRowState((s) => ({ ...s, [entry.id]: { saving: true, saved: false } }))
    const { data, error } = await db.updateLibraryStatus(user.id, entry.id, status)
    if (error || !data) {
      library.setData((list) => list.map((i) => (i.id === entry.id ? entry : i)))
      setRowState((s) => ({ ...s, [entry.id]: { saving: false, saved: false } }))
      return saveError(error, "Couldn't save your changes. Please try again.")
    }
    setRowState((s) => ({ ...s, [entry.id]: { saving: false, saved: true } }))
    // The row leaves a filtered tab, so its "Saved" note would never be seen
    if (tab !== 'all' && status !== tab) toast(`Moved “${entry.title}” to ${STATUS_LABELS[status]}.`)
  }

  async function openRemove(entry) {
    setRemoveDialog({ item: entry, count: null, busy: false })
    const { data } = await db.countLogsForItem(user.id, entry.id)
    setRemoveDialog((d) => (d.item?.id === entry.id ? { ...d, count: data ?? 0 } : d))
  }

  async function confirmRemove() {
    const entry = removeDialog.item
    setRemoveDialog((d) => ({ ...d, busy: true }))
    const { error } = await db.removeFromLibrary(user.id, entry.id)
    setRemoveDialog({ item: null, count: null, busy: false })
    if (error) return saveError(error, "Couldn't remove this book. Please try again.")
    library.setData((list) => list.filter((i) => i.id !== entry.id))
    toast(`Removed “${entry.title}” from your library.`)
  }

  return (
    <div className="library container">
      <title>My Library · BookWorm</title>
      <div className="library-head">
        <h1 className="drip">My Library</h1>
        {library.status === 'ready' && (
          <p className="muted">
            {plural(items.length, 'book')} saved{profile ? ` by ${profile.display_name}` : ''}
          </p>
        )}
      </div>

      <nav className="library-tabs" aria-label="Filter by reading status">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`library-tab ${tab === t.key ? 'is-current' : ''}`}
            aria-pressed={tab === t.key}
            onClick={() => setParams(t.key === 'all' ? {} : { status: t.key }, { replace: true })}
          >
            {t.key !== 'all' && <span aria-hidden="true">{statusIcon(mode, t.key)}</span>}
            {t.label}
            {library.status === 'ready' && <span className="library-tab-count">{counts[t.key]}</span>}
          </button>
        ))}
      </nav>

      {library.status === 'loading' && (
        <ul className="library-list" role="list" aria-busy="true" aria-label="Loading your library">
          {[0, 1, 2].map((n) => (
            <li key={n} className="library-row is-skeleton" aria-hidden="true">
              <div className="cover skeleton-block library-thumb" />
              <div className="library-info">
                <span className="skeleton-line" style={{ width: '50%', height: 18 }} />
                <span className="skeleton-line" style={{ width: '30%' }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {library.status === 'error' && (
        <StateMessage tone="error" title="Couldn't load your library." onRetry={library.reload}>
          {library.error.message}
        </StateMessage>
      )}

      {library.status === 'ready' && items.length === 0 && (
        <StateMessage title="Your library is empty">
          <p>Save books from any book page and they'll show up here.</p>
          <Link to="/" className="btn btn-primary state-message-action">
            Browse Books
          </Link>
        </StateMessage>
      )}

      {library.status === 'ready' && items.length > 0 && visible.length === 0 && (
        <StateMessage title={`No books marked ${STATUS_LABELS[tab]} yet.`}>
          <p>Change a book's status and it will appear in this tab.</p>
        </StateMessage>
      )}

      {library.status === 'ready' && visible.length > 0 && (
        <ul className="library-list" role="list">
          {visible.map((entry) => (
            <li key={entry.id} className="library-row">
              <Link to={`/books/${entry.volume_id}`} className="library-book">
                <CoverArt
                  book={{ title: entry.title, thumbnail: entry.thumbnail_url }}
                  decorative
                  className="library-thumb"
                />
                <span className="library-info">
                  <span className="library-title">{entry.title}</span>
                  <span className="library-meta muted">
                    {formatAuthors(entry.authors)} · Added {formatDate(entry.created_at)}
                  </span>
                </span>
              </Link>
              <div className="library-controls">
                <StatusSelect
                  compact
                  bookTitle={entry.title}
                  value={entry.status}
                  onChange={(status) => handleStatus(entry, status)}
                  saving={rowState[entry.id]?.saving}
                  saved={rowState[entry.id]?.saved}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  aria-label={`Remove ${entry.title} from your library`}
                  onClick={() => openRemove(entry)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(removeDialog.item)}
        title="Remove this book?"
        confirmLabel="Remove"
        busyLabel="Removing…"
        busy={removeDialog.busy}
        onConfirm={confirmRemove}
        onClose={() => setRemoveDialog({ item: null, count: null, busy: false })}
      >
        {removeDialog.item &&
          (removeDialog.count == null
            ? 'Checking your logs…'
            : removeDialog.count === 0
              ? `“${removeDialog.item.title}” will be removed from your library.`
              : `This will also delete your ${plural(removeDialog.count, 'log')} about “${removeDialog.item.title}”.`)}
      </ConfirmDialog>
    </div>
  )
}
