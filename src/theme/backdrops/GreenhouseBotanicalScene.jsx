// 🌿 Greenhouse Botanical: sunlight shifts through glass panes, vines sway from
// the corners, petals drift down, and potted plants sit in the corners.

const PETAL_COLORS = ['#f2b8c6', '#c46a4a', '#e9d8a6', '#ffffff', '#f4a3a8']
const PETALS = Array.from({ length: 12 }, (_, i) => ({
  x: `${(i * 29 + 5) % 100}%`,
  c: PETAL_COLORS[i % PETAL_COLORS.length],
  t: `${17 + ((i * 5) % 12)}s`,
  d: `-${(i * 2.9) % 22}s`,
  r: `${(i * 47) % 360}deg`,
}))

const LEAF = 'M0 0c10-12 28-12 34 0-8 12-26 12-34 0z'
// A vine: a curving stem with leaves along it
function Vine({ className, flip }) {
  const leaves = [[18, 40, -30], [8, 90, 25], [24, 140, -35], [10, 190, 30], [26, 240, -25], [14, 290, 20]]
  return (
    <svg className={className} viewBox="0 0 60 320" style={flip ? { scale: '-1 1' } : undefined}>
      <path d="M30 0c-14 50 14 90-2 150s16 110-4 170" stroke="#3f6b4f" strokeWidth="3" fill="none" />
      {leaves.map(([x, y, a], i) => (
        <path key={i} d={LEAF} transform={`translate(${x} ${y}) rotate(${a})`} fill={i % 2 ? '#5e8c6a' : '#3f6b4f'} />
      ))}
    </svg>
  )
}

function Plant({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 150">
      <g className="gb-plant-leaves">
        <path d="M60 90C40 60 20 50 6 52c10 20 30 34 54 38z" fill="#5e8c6a" />
        <path d="M60 90c18-34 40-46 56-44-8 22-30 38-56 44z" fill="#3f6b4f" />
        <path d="M60 92C56 56 62 26 74 8c8 26 2 58-14 84z" fill="#4f7b5c" />
      </g>
      <path d="M26 92h68l-8 52H34z" fill="#c46a4a" />
      <rect x="20" y="86" width="80" height="12" rx="3" fill="#b05a3c" />
    </svg>
  )
}

export default function GreenhouseBotanicalScene() {
  return (
    <>
      <div className="gb-glass" />
      <div className="gb-ray gb-ray-a" />
      <div className="gb-ray gb-ray-b" />
      <div className="gb-ray gb-ray-c" />
      <Vine className="gb-vine gb-vine-left" />
      <Vine className="gb-vine gb-vine-right" flip />
      {PETALS.map((p, i) => (
        <span key={i} className="gb-petal" style={{ '--x': p.x, '--c': p.c, '--t': p.t, '--d': p.d, '--r': p.r }} />
      ))}
      <Plant className="gb-plant gb-plant-left" />
      <Plant className="gb-plant gb-plant-right" />
    </>
  )
}
