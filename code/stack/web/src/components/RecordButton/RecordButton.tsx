import { MdFiberManualRecord, MdOutlineFiberManualRecord } from 'react-icons/md'
import { BUTTON_CLASS, ICON_IDLE_CLASS, ICON_RECORDING_CLASS, LABEL_START, LABEL_STOP } from './constants'
import { elapsedLabel } from './helpers'
import type { RecordButtonProps } from './types'

/**
 * Le bouton d'enregistrement d'un clip, posé en haut à gauche de la vidéo : un carré identique aux autres boutons de la vidéo avec une icône de rond, en contour gris au repos, pleine et rouge (qui pulse) quand ça enregistre. Un clic commence ou arrête ;
 * l'infobulle dit l'action et, pendant l'enregistrement, le temps écoulé.
 */
const RecordButton = ({ recording, busy, seconds, onToggle }: RecordButtonProps) => {
  const label = recording ? `${LABEL_STOP} (${elapsedLabel(seconds)})` : LABEL_START
  return (
    <button type="button" className={BUTTON_CLASS} aria-label={label} aria-pressed={recording} title={label} disabled={busy} onClick={onToggle}>
      {recording ? (
        <MdFiberManualRecord className={ICON_RECORDING_CLASS} aria-hidden="true" />
      ) : (
        <MdOutlineFiberManualRecord className={ICON_IDLE_CLASS} aria-hidden="true" />
      )}
    </button>
  )
}

export default RecordButton
