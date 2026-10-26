import { useTheme } from '../context/theme-context'
import { SCENES } from '../theme/backdrops'
import '../styles/backdrop.css'

// The animated background scene for the current style mode. Purely decorative:
// hidden from assistive tech, never focusable, and paused when the reader turns
// background animation off, asks for reduced motion, or switches tabs.
export default function ThemeBackdrop() {
  const { mode } = useTheme()
  const Scene = SCENES[mode]
  if (!Scene) return null
  return (
    <div className="backdrop" data-scene={mode} aria-hidden="true">
      <Scene />
      <div className="scene-veil" />
    </div>
  )
}
