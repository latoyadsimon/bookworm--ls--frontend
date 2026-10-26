import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import CoverArt from '../components/CoverArt'
import StateMessage from '../components/StateMessage'
import StatusSelect from '../components/StatusSelect'
import ConfirmDialog from '../components/ConfirmDialog'
import LogForm from '../components/LogForm'
import LogList from '../components/LogList'
import Icon from '../components/Icon'
import { useAuth } from '../context/auth-context'
import { useToast } from '../context/toast-context'
import { useTheme } from '../context/theme-context'
import { modeOrDefault } from '../theme/modes'
import { useLoad } from '../hooks/useLoad'
import { useSaveError } from '../hooks/useSaveError'
import { getBook } from '../services/booksApi'
import * as db from '../services/db'
import { formatAuthors, formatDate, plural } from '../lib/format'
import './book.css'

export default function BookDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  // Remount per book and per reader so nothing from the previous page leaks in
  return <BookDetails key={`${id}|${user?.id ?? 'guest'}`} id={id} />
}

function BookDetails({ id }) {
  const book = useLoad(() => getBook(id).then((data) => ({ data }), (error) => ({ error })), id)

  if (book.status === 'loading') return <BookSkeleton />
  if (book.status === 'error') {
    if (book.error.status === 404 || book.error.status === 400) {
      return (
        <div className="container book-missing">
          <title>Book not found · BookWorm</title>
          <h1>We couldn't find that book</h1>
          <StateMessage title="This link may be broken, or the book was removed.">
            <Link to="/" className="btn btn-primary state-message-action">
              <Icon name="home" size={18} /> Go Home
            </Link>
          </StateMessage>
        </div>
      )
    }
    return (
      <div className="container book-missing">
        <title>Book · BookWorm</title>
        <h1>Book details</h1>
        <StateMessage tone="error" title="We couldn't load this book right now." onRetry={book.reload}>
          {book.error.message}
        </StateMessage>
      </div>
    )
  }
  return <BookView book={book.data} />
}

function BookView({ book }) {
  const { user } = useAuth()
  const toast = useToast()
  const saveError = useSaveError()
  const navigate = useNavigate()
  const location = useLocation()

  const item = useLoad(() => db.getLibraryItem(user?.id, book.id), `item-${book.id}`)
  const logs = useLoad(() => db.listLogsForVolume(book.id), `logs-${book.id}`)

  const { mode } = useTheme()
  const [adding, setAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  useEffect(() => {
    if (!justAdded) return
    const t = setTimeout(() => setJustAdded(false), 1400)
    return () => clearTimeout(t)
  }, [justAdded])
  const [statusState, setStatusState] = useState({ saving: false, saved: false })
  const [removeDialog, setRemoveDialog] = useState({ open: false, count: null, busy: false })
  const [deleteDialog, setDeleteDialog] = useState({ log: null, busy: false })

  const year = book.publishedDate?.slice(0, 4)
  const inLibrary = item.status === 'ready' && item.data
  const authors = formatAuthors(book.authors)

  // ---------- library actions ----------
  async function handleAdd() {
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    setAdding(true)
    const { data, error } = await db.addToLibrary(user.id, {
      volume_id: book.id,
      title: book.title,
      authors: book.authors,
      thumbnail_url: book.thumbnail,
    })
    setAdding(false)
    if (error?.code === '23505') {
      // Already saved (e.g. in another tab): treat as success
      item.reload()
      toast('Already in your library.')
      return
    }
    if (error) return saveError(error, "Couldn't add this book. Please try again.")
    item.setData(data)
    setJustAdded(true)
    toast(modeOrDefault(mode).added)
  }

  async function handleStatus(status) {
    const previous = item.data
    item.setData({ ...previous, status }) // optimistic
    setStatusState({ saving: true, saved: false })
    const { data, error } = await db.updateLibraryStatus(user.id, previous.id, status)
    if (error || !data) {
      item.setData(previous)
      setStatusState({ saving: false, saved: false })
      return saveError(error, "Couldn't save your changes. Please try again.")
    }
    item.setData(data)
    setStatusState({ saving: false, saved: true })
  }

  async function openRemove() {
    setRemoveDialog({ open: true, count: null, busy: false })
    const { data } = await db.countLogsForItem(user.id, item.data.id)
    setRemoveDialog((d) => ({ ...d, count: data ?? 0 }))
  }

  async function confirmRemove() {
    setRemoveDialog((d) => ({ ...d, busy: true }))
    const removedId = item.data.id
    const { error } = await db.removeFromLibrary(user.id, removedId)
    if (error) {
      setRemoveDialog({ open: false, count: null, busy: false })
      return saveError(error, "Couldn't remove this book. Please try again.")
    }
    setRemoveDialog({ open: false, count: null, busy: false })
    item.setData(null)
    // ON DELETE CASCADE removed this reader's logs for the book
    logs.setData((list) => list?.filter((l) => l.library_item_id !== removedId) ?? list)
    toast('Removed from your library.')
  }

  // ---------- logs ----------
  async function handlePost(values) {
    const { data, error } = await db.addLog(user.id, {
      library_item_id: item.data.id,
      volume_id: book.id,
      ...values,
    })
    if (error) {
      if (error.code === '23503') saveError(error, 'Add this book to your library before writing a log.')
      else await saveError(error, "Couldn't save your log. Please try again.")
      return false
    }
    // Skip it if the list already has it (a load that finished after the post)
    logs.setData((list) => [data, ...(list ?? []).filter((l) => l.id !== data.id)])
    toast('Log posted.')
    return true
  }

  async function handleUpdate(log, values) {
    const { data, error } = await db.updateLog(user.id, log.id, values)
    if (error || !data) {
      await saveError(error, "Couldn't save your log. Please try again.")
      return false
    }
    logs.setData((list) => list.map((l) => (l.id === log.id ? data : l)))
    toast('Log updated.')
    return true
  }

  async function confirmDelete() {
    const log = deleteDialog.log
    setDeleteDialog({ log, busy: true })
    const { error } = await db.deleteLog(user.id, log.id)
    setDeleteDialog({ log: null, busy: false })
    if (error) return saveError(error, "Couldn't delete your log. Please try again.")
    logs.setData((list) => list.filter((l) => l.id !== log.id))
    toast('Log deleted.')
    // The deleted log's buttons are gone: keep keyboard users near where they were.
    // Wait for the dialog to close first, because closing restores focus to its opener.
    setTimeout(() => document.getElementById('logs-title')?.focus(), 60)
  }

  return (
    <article className="book container" aria-labelledby="book-title">
      <title>{`${book.title} · BookWorm`}</title>

      <div className="book-top">
        <CoverArt book={book} eager className="book-cover" />
        <div className="book-info">
          <h1 id="book-title" className="book-title">
            {book.title}
          </h1>
          <p className="book-authors">by {authors}</p>

          <dl className="book-facts">
            {book.publisher && (
              <div>
                <dt>Publisher</dt>
                <dd>{book.publisher}</dd>
              </div>
            )}
            {book.publishedDate && (
              <div>
                <dt>Published</dt>
                <dd>{year}</dd>
              </div>
            )}
            {book.pageCount && (
              <div>
                <dt>Pages</dt>
                <dd>{book.pageCount}</dd>
              </div>
            )}
            {book.categories?.length > 0 && (
              <div>
                <dt>Categories</dt>
                <dd>{book.categories.join(' · ')}</dd>
              </div>
            )}
            {book.averageRating && (
              <div>
                <dt>Google rating</dt>
                <dd>{book.averageRating} / 5</dd>
              </div>
            )}
          </dl>

          <div className={`book-actions ${justAdded ? 'just-added' : ''}`}>
            {!user ? (
              <>
                <button type="button" className="btn btn-primary" onClick={handleAdd}>
                  + Add to Library
                </button>
                <p className="book-actions-note muted">Log in to save books and write logs.</p>
              </>
            ) : item.status === 'loading' ? (
              <button type="button" className="btn btn-secondary" disabled>
                Checking your library…
              </button>
            ) : item.status === 'error' ? (
              <StateMessage tone="error" title="Couldn't check your library." onRetry={item.reload} compact />
            ) : inLibrary ? (
              <>
                <StatusSelect
                  value={item.data.status}
                  onChange={handleStatus}
                  saving={statusState.saving}
                  saved={statusState.saved}
                />
                <button type="button" className="btn btn-secondary book-remove" onClick={openRemove}>
                  Remove from Library
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={adding}>
                {adding ? 'Adding…' : '+ Add to Library'}
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="book-about" aria-labelledby="about-title">
        <h2 id="about-title">About this book</h2>
        <p className={book.description ? '' : 'muted'}>{book.description ?? 'No description available.'}</p>
      </section>

      <div className="book-logs">
        <section className="book-write" aria-labelledby="write-title">
          <h2 id="write-title" className="drip">
            Write a log
          </h2>
          {!user ? (
            <StateMessage title="Log in to write about this book.">
              <Link to="/login" state={{ from: location }} className="btn btn-secondary state-message-action">
                Log In
              </Link>
            </StateMessage>
          ) : inLibrary ? (
            <LogForm submitLabel="Post Log" busyLabel="Posting…" onSubmit={handlePost} />
          ) : item.status === 'ready' ? (
            <StateMessage title="Add this book to your library to write a log." />
          ) : null}
        </section>

        <section className="book-readers" aria-labelledby="logs-title">
          <h2 id="logs-title" className="drip" tabIndex={-1}>
            Reader Logs
          </h2>
          {logs.status === 'loading' && <p className="muted">Loading logs…</p>}
          {logs.status === 'error' && (
            <StateMessage tone="error" title="Couldn't load logs." onRetry={logs.reload}>
              The book details above are still here.
            </StateMessage>
          )}
          {logs.status === 'ready' &&
            (logs.data.length === 0 ? (
              <StateMessage title="No logs yet. Be the first to write one!" />
            ) : (
              <>
                <p className="muted log-total">{plural(logs.data.length, 'log')}, newest first</p>
                <LogList
                  logs={logs.data}
                  currentUserId={user?.id}
                  onUpdate={handleUpdate}
                  onDelete={(log) => setDeleteDialog({ log, busy: false })}
                />
              </>
            ))}
        </section>
      </div>

      <ConfirmDialog
        open={removeDialog.open}
        title="Remove this book?"
        confirmLabel="Remove"
        busyLabel="Removing…"
        busy={removeDialog.busy}
        onConfirm={confirmRemove}
        onClose={() => setRemoveDialog({ open: false, count: null, busy: false })}
      >
        {removeDialog.count == null
          ? 'Checking your logs…'
          : removeDialog.count === 0
            ? `“${book.title}” will be removed from your library.`
            : `Removing this book will also delete your ${plural(removeDialog.count, 'log')} about it.`}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteDialog.log)}
        title="Delete this log?"
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={deleteDialog.busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteDialog({ log: null, busy: false })}
      >
        {deleteDialog.log && `Your log from ${formatDate(deleteDialog.log.created_at)} will be gone for good.`}
      </ConfirmDialog>
    </article>
  )
}

function BookSkeleton() {
  return (
    <div className="book container" aria-busy="true" aria-label="Loading book">
      <div className="book-top">
        <div className="book-cover cover skeleton-block" />
        <div className="book-info">
          <span className="skeleton-line" style={{ width: '60%', height: 40 }} />
          <span className="skeleton-line" style={{ width: '30%' }} />
          <span className="skeleton-line" style={{ width: '50%', marginTop: 24 }} />
          <span className="skeleton-line" style={{ width: '45%' }} />
          <span className="skeleton-line" style={{ width: '40%' }} />
        </div>
      </div>
    </div>
  )
}
