// 🌙 Midnight Observatory: two layers of stars drift at different speeds while
// the brightest stars twinkle, a constellation slowly turns, shooting stars
// streak by, and the moon glows.

const BRIGHT = [
  ['9%', '22%', '3.2s', '-1s'], ['27%', '9%', '4.1s', '-2.5s'], ['44%', '28%', '2.8s', '-0.6s'],
  ['61%', '12%', '3.7s', '-1.9s'], ['76%', '38%', '4.4s', '-3.1s'], ['88%', '62%', '3s', '-0.3s'],
  ['15%', '66%', '3.9s', '-2.2s'], ['53%', '78%', '3.4s', '-1.4s'],
]

const SHOOTING = [
  { x: '14%', y: '8%', t: '13s', d: '-2s' },
  { x: '58%', y: '4%', t: '17s', d: '-10s' },
]

// A little constellation (the Bookworm, naturally)
const POINTS = [
  [20, 30], [70, 18], [120, 40], [150, 90], [110, 130], [60, 120], [170, 150],
]
const LINES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 6]]

export default function MidnightObservatoryScene() {
  return (
    <>
      <div className="mo-sky" />
      <div className="mo-nebula mo-nebula-a" />
      <div className="mo-nebula mo-nebula-b" />
      <div className="mo-stars mo-stars-far" />
      <div className="mo-stars mo-stars-near" />
      {BRIGHT.map(([x, y, t, d], i) => (
        <span key={i} className="mo-bright" style={{ '--x': x, '--y': y, '--t': t, '--d': d }} />
      ))}
      <svg className="mo-constellation" viewBox="0 0 200 180">
        {LINES.map(([a, b], i) => (
          <line key={i} x1={POINTS[a][0]} y1={POINTS[a][1]} x2={POINTS[b][0]} y2={POINTS[b][1]} />
        ))}
        {POINTS.map(([x, y], i) => (
          <g key={i}>
            <circle className="glow" cx={x} cy={y} r={i === 3 ? 9 : 7} />
            <circle cx={x} cy={y} r={i === 3 ? 4 : 3} />
          </g>
        ))}
      </svg>
      <div className="mo-moon">
        <span className="mo-moon-halo" />
        <span className="mo-moon-disc" />
      </div>
      {SHOOTING.map((s, i) => (
        <span key={i} className="mo-shooting" style={{ '--x': s.x, '--y': s.y, '--t': s.t, '--d': s.d }} />
      ))}
    </>
  )
}
