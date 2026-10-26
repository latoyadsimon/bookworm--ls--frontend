// 🧒 Kid Korner: puffy clouds drift, balloons and bubbles float up, confetti
// falls, and the bookworm mascot inches along the bottom of the screen.

const CLOUDS = [
  { y: '8%', s: 1, t: '70s', d: '-10s' },
  { y: '22%', s: 0.7, t: '55s', d: '-40s' },
  { y: '40%', s: 0.85, t: '80s', d: '-62s' },
]
const BALLOONS = [
  { x: '4%', c: '#ff6b9a', t: '22s', d: '-2s' },
  { x: '92%', c: '#6c3ce1', t: '26s', d: '-11s' },
  { x: '12%', c: '#2ec4b6', t: '24s', d: '-17s' },
  { x: '84%', c: '#ffb703', t: '28s', d: '-6s' },
]
const BUBBLES = Array.from({ length: 8 }, (_, i) => ({
  x: `${[6, 15, 24, 79, 87, 95, 34, 66][i]}%`,
  s: `${14 + ((i * 7) % 18)}px`,
  t: `${12 + ((i * 3) % 9)}s`,
  d: `-${(i * 2.3) % 14}s`,
}))
const CONFETTI_COLORS = ['#ff6b9a', '#ffb703', '#2ec4b6', '#6c3ce1', '#8ac926']
const CONFETTI = Array.from({ length: 12 }, (_, i) => ({
  x: `${(i * 31 + 3) % 100}%`,
  c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  t: `${14 + ((i * 5) % 10)}s`,
  d: `-${(i * 2.1) % 18}s`,
  r: `${(i * 37) % 180}deg`,
}))

function Balloon({ color }) {
  return (
    <svg viewBox="0 0 60 120" width="54" height="108">
      <path d="M30 76c-2 14 6 20 0 44" stroke="#5c5f7a" strokeWidth="1.5" fill="none" />
      <ellipse cx="30" cy="38" rx="26" ry="34" fill={color} />
      <ellipse cx="20" cy="24" rx="6" ry="10" fill="#ffffff" opacity="0.45" />
      <path d="M26 71h8l-4 7z" fill={color} />
    </svg>
  )
}

function Bookworm() {
  return (
    <svg className="kk-worm-body" viewBox="0 0 150 70" width="150" height="70">
      {[18, 40, 62, 84].map((cx, i) => (
        <circle key={cx} cx={cx} cy="48" r="16" fill={i % 2 ? '#8ac926' : '#7cb518'} />
      ))}
      <circle cx="112" cy="36" r="22" fill="#8ac926" />
      <circle cx="104" cy="32" r="7" fill="#ffffff" stroke="#2b2d42" strokeWidth="2.5" />
      <circle cx="122" cy="32" r="7" fill="#ffffff" stroke="#2b2d42" strokeWidth="2.5" />
      <path d="M111 32h4" stroke="#2b2d42" strokeWidth="2.5" />
      <circle cx="105" cy="33" r="2.5" fill="#2b2d42" />
      <circle cx="123" cy="33" r="2.5" fill="#2b2d42" />
      <path d="M106 46c4 4 10 4 14 0" stroke="#2b2d42" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M104 14c-2-8 4-12 6-6M120 14c2-8-4-12-6-6" stroke="#2b2d42" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="126" y="44" width="20" height="16" rx="2" fill="#6c3ce1" transform="rotate(-12 136 52)" />
    </svg>
  )
}

export default function KidKornerScene() {
  return (
    <>
      <div className="kk-sky" />
      <div className="kk-sun" />
      {CLOUDS.map((c, i) => (
        <span key={i} className="kk-cloud" style={{ '--y': c.y, '--s': c.s, '--t': c.t, '--d': c.d }} />
      ))}
      {BUBBLES.map((b, i) => (
        <span key={i} className="kk-bubble" style={{ '--x': b.x, '--s': b.s, '--t': b.t, '--d': b.d }} />
      ))}
      {CONFETTI.map((c, i) => (
        <span key={i} className="kk-confetti" style={{ '--x': c.x, '--c': c.c, '--t': c.t, '--d': c.d, '--r': c.r }} />
      ))}
      {BALLOONS.map((b, i) => (
        <span key={i} className="kk-balloon" style={{ '--x': b.x, '--t': b.t, '--d': b.d }}>
          <Balloon color={b.c} />
        </span>
      ))}
      <div className="kk-grass" />
      <div className="kk-worm">
        <Bookworm />
      </div>
    </>
  )
}
