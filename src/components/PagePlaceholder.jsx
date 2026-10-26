import './PagePlaceholder.css'

// Temporary stand-in for pages that are built in later phases.
export default function PagePlaceholder({ title, route, phase, children }) {
  return (
    <section className="placeholder container">
      <title>{`${title} · BookWorm`}</title>
      <h1 className="drip">{title}</h1>
      <p className="placeholder-route muted">
        <code>{route}</code>
      </p>
      {children}
      <p className="placeholder-note">This page is built in Phase {phase}.</p>
    </section>
  )
}
