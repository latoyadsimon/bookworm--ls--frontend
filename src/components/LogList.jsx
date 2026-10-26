import { useState } from 'react'
import LogForm from './LogForm'
import { Stars } from './Stars'
import { formatDate } from '../lib/format'

// Every reader's logs for a book. Only the signed-in author's own logs get Edit / Delete.
export default function LogList({ logs, currentUserId, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null)

  return (
    <ol className="log-list" role="list">
      {logs.map((log) => {
        const mine = log.user_id === currentUserId
        const edited = log.updated_at !== log.created_at
        return (
          <li key={log.id} className={`log-item ${mine ? 'is-mine' : ''}`}>
            <div className="log-head">
              <p className="log-author">
                {log.profiles.display_name}
                {mine && <span className="log-you"> (you)</span>}
              </p>
              <p className="log-meta muted">
                <time dateTime={log.created_at}>{formatDate(log.created_at)}</time>
                {edited && ' · edited'}
              </p>
              {log.rating ? <Stars value={log.rating} /> : <span className="log-norating muted">No rating</span>}
            </div>

            {editingId === log.id ? (
              <LogForm
                initial={log}
                submitLabel="Save"
                busyLabel="Saving…"
                autoFocus
                onCancel={() => setEditingId(null)}
                onSubmit={async (values) => {
                  const ok = await onUpdate(log, values)
                  if (ok) setEditingId(null)
                  return ok
                }}
              />
            ) : (
              <>
                <p className="log-body">{log.body}</p>
                {mine && (
                  <div className="log-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(log.id)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDelete(log)}>
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}
