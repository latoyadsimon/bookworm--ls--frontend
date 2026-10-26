// ☕ Little Cafe: a latte steams in the corner, pastel sprinkles and coffee
// beans drift down, soft bokeh light floats across a gingham tablecloth.

const BOKEH = [
  { x: '-8%', y: '6%', s: '34vmax', c: '232 180 184', t: '30s', d: '-6s' },
  { x: '74%', y: '-10%', s: '30vmax', c: '156 181 154', t: '36s', d: '-14s' },
  { x: '62%', y: '58%', s: '28vmax', c: '232 180 184', t: '26s', d: '-20s' },
  { x: '-6%', y: '64%', s: '26vmax', c: '243 230 216', t: '32s', d: '-3s' },
]

const SPRINKLE_COLORS = ['#e8b4b8', '#9cb59a', '#f2c879', '#b8a1d9', '#8b4a2b', '#f4a3a8']
const SPRINKLES = Array.from({ length: 22 }, (_, i) => ({
  x: `${(i * 37 + 7) % 100}%`,
  c: SPRINKLE_COLORS[i % SPRINKLE_COLORS.length],
  r: `${(i * 53) % 180}deg`,
  t: `${18 + ((i * 7) % 14)}s`,
  d: `-${(i * 3.3) % 24}s`,
}))

const BEANS = [
  { x: '4%', t: '26s', d: '-4s' },
  { x: '21%', t: '31s', d: '-17s' },
  { x: '78%', t: '28s', d: '-9s' },
  { x: '94%', t: '34s', d: '-22s' },
]

const STEAM = 'M20 96c-14-14 12-24 0-40s12-26 0-44'

export default function LittleCafeScene() {
  return (
    <>
      <div className="lc-table" />
      <div className="lc-awning lc-awning-left" />
      <div className="lc-awning lc-awning-right" />
      {BOKEH.map((b, i) => (
        <span key={i} className="lc-bokeh" style={{ '--x': b.x, '--y': b.y, '--s': b.s, '--c': b.c, '--t': b.t, '--d': b.d }} />
      ))}
      {SPRINKLES.map((s, i) => (
        <span key={i} className="lc-sprinkle" style={{ '--x': s.x, '--c': s.c, '--r': s.r, '--t': s.t, '--d': s.d }} />
      ))}
      {BEANS.map((b, i) => (
        <svg key={i} className="lc-bean" viewBox="0 0 20 28" width="18" height="25" style={{ '--x': b.x, '--t': b.t, '--d': b.d }}>
          <ellipse cx="10" cy="14" rx="9" ry="13" fill="#6b3a22" />
          <path d="M10 2c-5 7 5 17 0 24" stroke="#3b2a20" strokeWidth="2" fill="none" />
        </svg>
      ))}
      <div className="lc-cup">
        {[0, 1, 2].map((i) => (
          <svg key={i} className="lc-steam" viewBox="0 0 40 100" style={{ '--i': i }}>
            <path d={STEAM} stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none" />
          </svg>
        ))}
        <svg className="lc-mug" viewBox="0 0 160 120">
          <ellipse cx="80" cy="108" rx="76" ry="10" fill="#e3d3c3" />
          <path d="M28 30h96v40c0 28-22 40-48 40S28 98 28 70z" fill="#ffffff" stroke="#e3d3c3" strokeWidth="3" />
          <path d="M124 42c22 0 22 30 0 30" stroke="#ffffff" strokeWidth="9" fill="none" />
          <ellipse cx="76" cy="30" rx="48" ry="9" fill="#c8956d" />
          <path d="M64 30c6-8 18-8 24 0-6 6-18 6-24 0z" fill="#f3e6d8" />
        </svg>
      </div>
    </>
  )
}
