import { HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2'
import { BORDER_HIDDEN_CLASS, BORDER_SHOWN_CLASS, BUTTON_CLASS, LABEL_HIDE, LABEL_SHOW } from './constants'
import type { CleanToggleProps } from './types'

/**
 * Le bouton qui cache ou réaffiche d'un coup tout ce qui est posé sur la vidéo (repères des autres caméras, indicateurs, heure, barre d'avancement, contours du mouvement) : un œil, en haut à gauche.
 * Cadre accentué et œil simple quand tout est montré, œil barré quand tout est caché.
 */
const CleanToggle = ({ visible, onToggle }: CleanToggleProps) => {
  const label = visible ? LABEL_HIDE : LABEL_SHOW
  return (
    <button
      type="button"
      className={`${BUTTON_CLASS} ${visible ? BORDER_SHOWN_CLASS : BORDER_HIDDEN_CLASS}`}
      aria-label={label}
      aria-pressed={visible}
      title={label}
      onClick={onToggle}
    >
      {visible ? <HiOutlineEye aria-hidden="true" /> : <HiOutlineEyeSlash aria-hidden="true" />}
    </button>
  )
}

export default CleanToggle
