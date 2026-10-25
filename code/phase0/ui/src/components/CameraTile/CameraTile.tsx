import { BUTTON_CLASS, CAPTION_CLASS, NAME_CLASS, OPEN_PREFIX, TILE_CLASS } from './constants'
import type { CameraTileProps } from './types'

/**
 * Une vignette de la mosaïque : le média (le direct), le nom de la caméra et, au besoin, une légende. Un bouton
 * transparent couvre la vignette (le média peut contenir ce qu'il veut) : un clic ouvre le détail de la caméra.
 */
const CameraTile = ({ name, media, caption = '', onOpen }: CameraTileProps) => {
  return (
    <div className={TILE_CLASS}>
      {media}
      <div className={NAME_CLASS}>{name}</div>
      {caption ? <div className={CAPTION_CLASS}>{caption}</div> : null}
      <button type="button" className={BUTTON_CLASS} aria-label={`${OPEN_PREFIX}${name}`} onClick={onOpen} />
    </div>
  )
}

export default CameraTile
