import { FRAME_CLASS, TURNED_CLASS } from './constants'
import type { RotatedMediaProps } from './types'

/**
 * Un média en 16/9 tourné d'un quart de tour dans le sens horaire (une caméra posée de côté) : le cadre devient un 9/16, la vidéo y est couchée.
 * Sans `turned`, le média est rendu tel quel.
 */
const RotatedMedia = ({ turned, children }: RotatedMediaProps) => {
  if (!turned) return <>{children}</>
  return (
    <div className={FRAME_CLASS} data-rotated-frame>
      <div className={TURNED_CLASS}>{children}</div>
    </div>
  )
}

export default RotatedMedia
