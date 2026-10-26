// 💥 Comic Panel Pop: halftone dots drift, speed-line bursts slowly turn, and
// sound effects (BAM! ZAP! WOW!) pop in and out around the edges.

const SFX = [
  { word: 'BAM!', x: '-2%', y: '16%', c: '#ffd400', r: '-12deg', t: '11s', d: '-1s' },
  { word: 'ZAP!', x: '91%', y: '22%', c: '#0072ce', r: '10deg', t: '13s', d: '-6s' },
  { word: 'WOW!', x: '-2%', y: '74%', c: '#e4002b', r: '8deg', t: '12s', d: '-9s' },
  { word: 'POW!', x: '90%', y: '70%', c: '#ffd400', r: '-8deg', t: '14s', d: '-3s' },
  { word: 'ZOOM!', x: '44%', y: '88%', c: '#0072ce', r: '-4deg', t: '15s', d: '-11s' },
]

export default function ComicPanelPopScene() {
  return (
    <>
      <div className="cp-paper" />
      <div className="cp-dots" />
      <div className="cp-burst cp-burst-a" />
      <div className="cp-burst cp-burst-b" />
      {SFX.map((s, i) => (
        <span key={i} className="cp-sfx" style={{ '--x': s.x, '--y': s.y, '--c': s.c, '--r': s.r, '--t': s.t, '--d': s.d }}>
          <span className="cp-sfx-word">{s.word}</span>
        </span>
      ))}
    </>
  )
}
