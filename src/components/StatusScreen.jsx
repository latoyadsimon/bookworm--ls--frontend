import './StatusScreen.css'

// Full-page message used by the 404 page and the crash screen.
export default function StatusScreen({ code, title, message, children }) {
  return (
    <section className="status-screen container" aria-labelledby="status-title">
      <p className="status-art-code" aria-hidden="true">
        {code}
      </p>
      <h1 id="status-title" className="status-title">
        {title}
      </h1>
      <p className="status-message muted">{message}</p>
      <div className="status-actions">{children}</div>
    </section>
  )
}
