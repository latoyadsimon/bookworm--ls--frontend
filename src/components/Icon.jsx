// Small inline SVG icon set (stroke icons, 24px grid). Icons are decorative by
// default; give the surrounding button an accessible name.
const PATHS = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  palette: (
    <>
      <path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3.6-3.6 3.6h-1.8a1.8 1.8 0 0 0-1.35 3A1.5 1.5 0 0 1 12 21Z" />
      <circle cx="7.5" cy="11" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="7" r="1.1" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1.1" fill="currentColor" />
    </>
  ),
  book: (
    <>
      <path d="M3 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3Z" />
      <path d="M21 5h-6a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21Z" />
    </>
  ),
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4Z" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v5h-5" />
    </>
  ),
}

export default function Icon({ name, size = 22, className, strokeWidth = 2 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
