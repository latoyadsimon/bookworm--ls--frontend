// 🕯️ Cozy Library: a lamp-lit reading room. The lamp glow breathes, dust motes
// float through a beam of light, rain runs down the window, and a bookshelf
// lines the bottom of the room.

const MOTES = Array.from({ length: 14 }, (_, i) => ({
  x: `${4 + ((i * 23) % 34)}%`,
  y: `${18 + ((i * 41) % 60)}%`,
  t: `${9 + ((i * 5) % 9)}s`,
  d: `-${(i * 2.7) % 14}s`,
  s: `${2 + (i % 3)}px`,
}))

const RAIN = Array.from({ length: 9 }, (_, i) => ({
  x: `${8 + i * 10.5}%`,
  t: `${1.4 + ((i * 3) % 7) / 10}s`,
  d: `-${(i * 0.37) % 1.6}s`,
  h: `${40 + ((i * 17) % 50)}px`,
}))

const SPINE_COLORS = ['#5a2e2e', '#2f5d50', '#6b4a2b', '#8c2f39', '#3a2c21', '#4a3828', '#7a5a2a', '#2c3e50', '#5e3b1f']
const SPINES = (() => {
  const out = []
  let x = 0
  for (let i = 0; x < 1600; i++) {
    const w = 14 + ((i * 7) % 16)
    const h = 70 + ((i * 13) % 50)
    const lean = i % 11 === 5
    out.push({ x, w, h, c: SPINE_COLORS[i % SPINE_COLORS.length], band: i % 3 === 0, lean })
    x += w + (lean ? 10 : 2)
  }
  return out
})()

export default function CozyLibraryScene() {
  return (
    <>
      <div className="cl-panels" />
      <div className="cl-lamp" />
      <div className="cl-beam" />
      {MOTES.map((m, i) => (
        <span key={i} className="cl-mote" style={{ '--x': m.x, '--y': m.y, '--t': m.t, '--d': m.d, '--s': m.s }} />
      ))}
      <div className="cl-window">
        {RAIN.map((r, i) => (
          <span key={i} className="cl-rain" style={{ '--x': r.x, '--t': r.t, '--d': r.d, '--h': r.h }} />
        ))}
        <span className="cl-window-frame" />
      </div>
      <svg className="cl-shelf" viewBox="0 0 1600 140" preserveAspectRatio="xMidYMax slice">
        {SPINES.map((s, i) => (
          <g key={i} transform={s.lean ? `rotate(-8 ${s.x + s.w} 128)` : undefined}>
            <rect x={s.x} y={128 - s.h} width={s.w} height={s.h} fill={s.c} rx="1.5" />
            {s.band && <rect x={s.x} y={128 - s.h + 10} width={s.w} height="4" fill="#c9a227" opacity="0.55" />}
          </g>
        ))}
        <rect x="0" y="128" width="1600" height="12" fill="#4a3828" />
      </svg>
    </>
  )
}
