import { FRAME_CLASS, FRAME_TONE_CLASS } from './constants'
import type { StatusFrameProps } from './types'

/** Le liseré d'état d'un équipement dans un aperçu (caméra, clim, volet) : rouge s'il est éteint, bleu pâle ou violet pour un volet ouvert ou baissé, rien quand il marche. Un seul composant pour tous les aperçus. */
const StatusFrame = ({ tone, children }: StatusFrameProps) => <div className={`${FRAME_CLASS} ${FRAME_TONE_CLASS[tone]}`}>{children}</div>

export default StatusFrame
