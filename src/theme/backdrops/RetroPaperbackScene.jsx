// 🕺 Retro Paperback '70s: a sunburst slowly turns, groovy stripe waves roll
// along the bottom, and lava-lamp blobs drift up and down.

const BLOBS = [
  { x: '4%', y: '20%', s: '13vmax', c: '#e1a730', t: '24s', d: '-3s' },
  { x: '86%', y: '12%', s: '10vmax', c: '#b5461a', t: '30s', d: '-14s' },
  { x: '90%', y: '48%', s: '8vmax', c: '#6b7a2e', t: '21s', d: '-8s' },
  { x: '2%', y: '58%', s: '9vmax', c: '#b5461a', t: '27s', d: '-19s' },
]

// One wave period is 400 units wide; the path spans two periods so a -50% slide loops seamlessly
const WAVE = 'M0 40 Q100 0 200 40 T400 40 T600 40 T800 40 V120 H0z'

export default function RetroPaperbackScene() {
  return (
    <>
      <div className="rp-paper" />
      <div className="rp-sunburst" />
      {BLOBS.map((b, i) => (
        <span key={i} className="rp-blob" style={{ '--x': b.x, '--y': b.y, '--s': b.s, '--c': b.c, '--t': b.t, '--d': b.d }} />
      ))}
      <div className="rp-waves">
        {['#b5461a', '#e1a730', '#6e4a2f'].map((c, i) => (
          <svg key={c} className="rp-wave" viewBox="0 0 800 120" preserveAspectRatio="none" style={{ '--i': i }}>
            <path d={WAVE} fill={c} />
          </svg>
        ))}
      </div>
    </>
  )
}
