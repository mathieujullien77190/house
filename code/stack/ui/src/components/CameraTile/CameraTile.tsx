import {
  BUTTON_CLASS,
  CAPTION_CLASS,
  FOOTER_BUTTON_CLASS,
  FOOTER_CLASS,
  MEDIA_CLASS,
  MEDIA_INNER_CLASS,
  NAME_CLASS,
  OPEN_PREFIX,
  OVERLAY_CLASS,
  TILE_ALERT_CLASS,
  TILE_CLASS,
} from './constants'
import type { CameraTileProps } from './types'

/**
 * Une vignette de la mosaïque : le média (le direct), le nom de la caméra et, au besoin, une légende. Un bouton
 * transparent couvre la vignette (le média peut contenir ce qu'il veut) : un clic ouvre le détail de la caméra.
 */
const CameraTile = ({ name, media, overlay, caption = '', footer, alert = false, onOpenFooter, onOpen }: CameraTileProps) => {
  return (
    <div className={alert ? TILE_ALERT_CLASS : TILE_CLASS}>
      <div className={MEDIA_CLASS}>
        <div className={MEDIA_INNER_CLASS}>{media}</div>
        {overlay ? <div className={OVERLAY_CLASS}>{overlay}</div> : null}
      </div>
      <div className={NAME_CLASS}>{name}</div>
      {caption ? <div className={CAPTION_CLASS}>{caption}</div> : null}
      {footer ? (
        onOpenFooter ? (
          <button type="button" className={FOOTER_BUTTON_CLASS} onClick={onOpenFooter}>
            {footer}
          </button>
        ) : (
          <div className={FOOTER_CLASS}>{footer}</div>
        )
      ) : null}
      <button type="button" className={BUTTON_CLASS} aria-label={`${OPEN_PREFIX}${name}`} onClick={onOpen} />
    </div>
  )
}

export default CameraTile
