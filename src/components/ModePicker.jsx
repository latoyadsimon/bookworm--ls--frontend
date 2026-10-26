import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { MODES } from '../theme/modes'
import { useTheme } from '../context/theme-context'
import { useAuth } from '../context/auth-context'
import { useDismiss } from '../hooks/useDismiss'

const COLUMNS = 3

// 🎨 Style mode picker: a popover grid of preview tiles.
// Arrow keys move between tiles, Enter selects, Esc closes.
export default function ModePicker() {
  const { mode, setMode, motion, setMotion, reducedMotion } = useTheme()
  const { saveTheme } = useAuth()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const tileRefs = useRef([])
  const close = useCallback(() => setOpen(false), [])
  useDismiss(wrapRef, open, close, buttonRef)

  // Move focus to the current mode's tile when the picker opens
  useEffect(() => {
    if (!open) return
    const current = MODES.findIndex((m) => m.key === mode)
    tileRefs.current[current]?.focus()
  }, [open, mode])

  function onGridKeyDown(e) {
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }
    if (!(e.key in moves)) return
    e.preventDefault()
    const from = tileRefs.current.indexOf(document.activeElement)
    const to = Math.min(MODES.length - 1, Math.max(0, from + moves[e.key]))
    tileRefs.current[to]?.focus()
  }

  return (
    <div className="mode-picker" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-label="Change style mode"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="palette" />
      </button>

      {open && (
        <div className="mode-popover" role="dialog" aria-label="Style modes">
          <p className="mode-popover-title">Pick a style mode</p>
          <div className="mode-grid" onKeyDown={onGridKeyDown}>
            {MODES.map((m, i) => {
              const isCurrent = m.key === mode
              return (
                <button
                  key={m.key}
                  ref={(el) => (tileRefs.current[i] = el)}
                  type="button"
                  className={`mode-tile ${isCurrent ? 'is-current' : ''}`}
                  aria-pressed={isCurrent}
                  aria-disabled={!m.ready || undefined}
                  onClick={() => {
                    if (!m.ready) return
                    setMode(m.key)
                    saveTheme(m.key)
                    close()
                    buttonRef.current?.focus()
                  }}
                >
                  <span
                    className="mode-swatch"
                    style={{ background: m.preview.bg, borderColor: m.preview.accent }}
                    aria-hidden="true"
                  >
                    <span style={{ background: m.preview.accent }} />
                    <span style={{ background: m.preview.accent2 }} />
                    <span style={{ background: m.preview.surface }} />
                  </span>
                  <span className="mode-name">{m.name}</span>
                  <span className="mode-status">
                    {isCurrent ? (
                      <>
                        <Icon name="check" size={14} /> Current
                      </>
                    ) : m.ready ? (
                      m.vibe
                    ) : (
                      'Coming soon'
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="motion-row">
            <span id="motion-label" className="motion-label">
              Background animation
              {reducedMotion && <span className="motion-note">Paused: your device asks for reduced motion</span>}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={motion === 'on'}
              aria-labelledby="motion-label"
              className="motion-switch"
              onClick={() => setMotion(motion === 'on' ? 'off' : 'on')}
            >
              <span className="motion-switch-track" aria-hidden="true">
                <span className="motion-switch-thumb" />
              </span>
              <span className="motion-switch-text">{motion === 'on' ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
