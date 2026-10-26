// 👑 Street Royalty: a tagged brick wall. Spray-paint clouds drift and bloom,
// fresh paint drips down from the top, crowns and sparkles twinkle.

const CLOUDS = [
  { x: '-12%', y: '-14%', s: '62vmax', c: '255 46 147', dx: '6vw', dy: '5vh', t: '28s', d: '-4s' },
  { x: '68%', y: '-18%', s: '50vmax', c: '255 210 63', dx: '-5vw', dy: '6vh', t: '34s', d: '-12s' },
  { x: '-18%', y: '58%', s: '56vmax', c: '0 229 212', dx: '7vw', dy: '-6vh', t: '31s', d: '-20s' },
  { x: '72%', y: '62%', s: '58vmax', c: '255 46 147', dx: '-6vw', dy: '-4vh', t: '26s', d: '-9s' },
]

const DRIPS = [
  { x: '3%', h: '22vh', c: '#ff2e93', t: '9s', d: '-1s', w: '9px' },
  { x: '9%', h: '13vh', c: '#ffd23f', t: '12s', d: '-6s', w: '6px' },
  { x: '16%', h: '30vh', c: '#00e5d4', t: '14s', d: '-3s', w: '7px' },
  { x: '83%', h: '18vh', c: '#00e5d4', t: '11s', d: '-8s', w: '8px' },
  { x: '89%', h: '34vh', c: '#ff2e93', t: '15s', d: '-2s', w: '10px' },
  { x: '96%', h: '15vh', c: '#ffd23f', t: '10s', d: '-5s', w: '6px' },
]

const STAR = 'M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z'
const CROWN = 'M2 19 4 6l5.2 5.6L12 3l2.8 8.6L20 6l2 13z'
const SPARKS = [
  { x: '6%', y: '30%', s: 26, shape: CROWN, c: '#ffd23f', t: '5s', d: '-1s' },
  { x: '12%', y: '74%', s: 18, shape: STAR, c: '#ffffff', t: '3.6s', d: '-2.2s' },
  { x: '4%', y: '52%', s: 14, shape: STAR, c: '#ff2e93', t: '4.4s', d: '-0.6s' },
  { x: '92%', y: '26%', s: 30, shape: CROWN, c: '#ff2e93', t: '6s', d: '-3s' },
  { x: '87%', y: '58%', s: 16, shape: STAR, c: '#ffd23f', t: '3.2s', d: '-1.4s' },
  { x: '95%', y: '80%', s: 22, shape: STAR, c: '#00e5d4', t: '4.8s', d: '-2.8s' },
  { x: '48%', y: '8%', s: 14, shape: STAR, c: '#ffffff', t: '3.9s', d: '-0.4s' },
]

export default function StreetRoyaltyScene() {
  return (
    <>
      <div className="sr-wall" />
      {CLOUDS.map((c, i) => (
        <span
          key={i}
          className="sr-cloud"
          style={{ '--x': c.x, '--y': c.y, '--s': c.s, '--c': c.c, '--dx': c.dx, '--dy': c.dy, '--t': c.t, '--d': c.d }}
        />
      ))}
      <svg className="sr-tag sr-tag-a" viewBox="0 0 600 160">
        <text x="0" y="130">QUEEN</text>
      </svg>
      <svg className="sr-tag sr-tag-b" viewBox="0 0 600 160">
        <text x="0" y="130">READ</text>
      </svg>
      {DRIPS.map((d, i) => (
        <span key={i} className="sr-drip" style={{ '--x': d.x, '--h': d.h, '--c': d.c, '--t': d.t, '--d': d.d, '--w': d.w }}>
          <i />
        </span>
      ))}
      {SPARKS.map((s, i) => (
        <svg
          key={i}
          className="sr-spark"
          viewBox="0 0 24 24"
          width={s.s}
          height={s.s}
          style={{ '--x': s.x, '--y': s.y, '--t': s.t, '--d': s.d }}
        >
          <path d={s.shape} fill={s.c} />
        </svg>
      ))}
    </>
  )
}
