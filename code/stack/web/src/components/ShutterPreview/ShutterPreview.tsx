import ShutterCard from '@/components/ShuttersPanel/ShutterCard'
import { failureOf, useShutters } from '@/lib/useShutters'
import { CLOSED_BORDER_CLASS, LOADING_TEXT, NOTE_CLASS, OPEN_BORDER_CLASS, UNKNOWN_TEXT, WRAP_CLASS } from './constants'
import type { ShutterPreviewProps } from './types'

/**
 * L'aperçu d'un volet roulant sur la carte (un clic sur son icône) : **le même bloc que dans l'onglet Volet** (Monter, Stop, Descendre, Fermer à moitié, le dernier ordre, l'action automatique), avec la même
 * lecture et les mêmes ordres (`useShutters`). L'état est relu toutes les 10 s ; après un ordre, la réponse de l'API s'affiche tout de suite.
 */
const ShutterPreview = ({ apiKey, shutterId }: ShutterPreviewProps) => {
  const { state, busy, failed, send, half, changeAuto } = useShutters(apiKey)
  const shutter = state?.shutters.find((candidate) => candidate.id === shutterId)
  return shutter ? (
    <div className={`${WRAP_CLASS} ${shutter.lastCommand === 'down' ? CLOSED_BORDER_CLASS : OPEN_BORDER_CLASS}`}>
      <ShutterCard
        shutter={shutter}
        busy={busy === shutterId}
        failed={failureOf(failed, shutterId)}
        onSend={(command) => send(shutterId, command)}
        onHalf={() => half(shutterId)}
        onAuto={(option, value) => changeAuto(shutterId, option, value)}
      />
    </div>
  ) : (
    <span className={NOTE_CLASS}>{state === null ? LOADING_TEXT : UNKNOWN_TEXT}</span>
  )
}

export default ShutterPreview
