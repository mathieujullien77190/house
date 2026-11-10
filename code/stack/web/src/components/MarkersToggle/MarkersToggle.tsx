import { HiOutlineVideoCamera, HiOutlineVideoCameraSlash } from 'react-icons/hi2'
import { BORDER_HIDDEN_CLASS, BORDER_SHOWN_CLASS, BUTTON_CLASS, LABEL_HIDE, LABEL_SHOW } from './constants'
import type { MarkersToggleProps } from './types'

/**
 * Le bouton qui montre ou cache les icônes de caméra des autres caméras posés sur l'image du direct : un carré avec un appareil photo, à côté de l'icône du son, en bas à droite de la vidéo.
 * Cadre accentué et appareil simple quand les repères sont montrés, appareil barré quand ils sont cachés. L'icône est un dessin (comme celle du son), donc centrée dans son carré.
 */
const MarkersToggle = ({ visible, onToggle }: MarkersToggleProps) => {
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
      {visible ? <HiOutlineVideoCamera aria-hidden="true" /> : <HiOutlineVideoCameraSlash aria-hidden="true" />}
    </button>
  )
}

export default MarkersToggle
