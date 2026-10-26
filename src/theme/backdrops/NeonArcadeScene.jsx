// 🕹️ Neon Arcade: a synthwave horizon. A striped sun glows over a perspective
// grid floor that scrolls toward you; pixel stars blink; a scan beam sweeps down.

const STARS = [
  ['8%', '12%', '3.1s', '-0.4s'], ['17%', '26%', '4.2s', '-2s'], ['26%', '8%', '2.7s', '-1s'],
  ['34%', '20%', '3.8s', '-3s'], ['63%', '10%', '3.3s', '-0.8s'], ['72%', '24%', '4.6s', '-1.6s'],
  ['81%', '14%', '2.9s', '-2.4s'], ['91%', '30%', '3.6s', '-0.2s'], ['5%', '40%', '4s', '-1.2s'],
  ['95%', '44%', '3.4s', '-2.8s'], ['44%', '5%', '4.4s', '-3.4s'], ['55%', '33%', '3s', '-1.8s'],
]

export default function NeonArcadeScene() {
  return (
    <>
      <div className="na-sky" />
      {STARS.map(([x, y, t, d], i) => (
        <span key={i} className="na-star" style={{ '--x': x, '--y': y, '--t': t, '--d': d }} />
      ))}
      <div className="na-sun" />
      <div className="na-floor">
        <div className="na-grid" />
      </div>
      <div className="na-horizon" />
      <div className="na-scanlines" />
      <div className="na-beam" />
    </>
  )
}
