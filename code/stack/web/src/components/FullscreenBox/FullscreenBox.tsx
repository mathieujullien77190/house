import { useEffect, useRef, useState } from 'react'
import { BOX_CLASS, BUTTON_CLASS, ENTER_LABEL, EXIT_LABEL, ICON } from './constants'
import type { FullscreenBoxProps } from './types'

/**
 * Un contenu (un clip) qui peut prendre tout l'écran : un petit carré « ⛶ » en haut à droite le passe en plein écran du navigateur (Échap ou le même carré le referme). En plein écran, fond noir,
 * contenu centré ; `--big-h` vaut la hauteur de l'écran (un clip en portrait la prend toute).
 */
const FullscreenBox = ({ children }: FullscreenBoxProps) => {
  const box = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    else void box.current?.requestFullscreen().catch(() => undefined)
  }
  return (
    <div ref={box} className={BOX_CLASS}>
      {children}
      <button
        type="button"
        className={BUTTON_CLASS}
        aria-label={full ? EXIT_LABEL : ENTER_LABEL}
        title={full ? EXIT_LABEL : ENTER_LABEL}
        onClick={toggle}
      >
        {ICON}
      </button>
    </div>
  )
}

export default FullscreenBox
