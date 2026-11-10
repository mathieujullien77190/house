import { Button, Checkbox } from '@house/ui'
import type { ShutterAuto, ShutterCommand, ShutterInfo } from '@/types'
import {
  AUTO_CLOSE_LABEL,
  AUTO_ERROR_TEXT,
  AUTO_OPEN_LABEL,
  BUTTONS_CLASS,
  CARD_CLASS,
  COMMANDS,
  ERROR_CLASS,
  HALF_LABEL,
  HALF_RUNNING_TEXT,
  LAST_CLASS,
  NAME_CLASS,
  SEND_ERROR_TEXT,
} from './constants'
import { lastText } from './helpers'

interface ShutterCardProps {
  shutter: ShutterInfo
  /** Un ordre est en route pour ce volet : ses boutons sont grisés. */
  busy: boolean
  /** Ce qui a échoué : l'ordre ou le réglage automatique ; null : rien. */
  failed: 'send' | 'auto' | null
  onSend: (command: ShutterCommand) => void
  onHalf: () => void
  onAuto: (option: keyof ShutterAuto, value: boolean) => void
}

/** Le bloc d'un volet roulant : son nom, Monter / Stop / Descendre (et « Fermer à moitié »), le dernier ordre et les deux cases de l'action automatique. Le même dans l'onglet Volet et dans l'aperçu de la carte. */
const ShutterCard = ({ shutter, busy, failed, onSend, onHalf, onAuto }: ShutterCardProps) => (
  <div className={CARD_CLASS}>
    <span className={NAME_CLASS}>{shutter.name}</span>
    <div className={BUTTONS_CLASS}>
      {COMMANDS.map((command) => (
        <Button key={command.id} disabled={busy} onClick={() => onSend(command.id)}>
          {command.label}
        </Button>
      ))}
      {shutter.closeSeconds ? (
        <Button disabled={busy || shutter.halfRunning} onClick={onHalf}>
          {HALF_LABEL}
        </Button>
      ) : null}
    </div>
    {shutter.halfRunning ? <span className={LAST_CLASS}>{HALF_RUNNING_TEXT}</span> : null}
    <span className={LAST_CLASS}>{lastText(shutter)}</span>
    {shutter.auto !== null ? (
      <>
        <Checkbox label={AUTO_OPEN_LABEL} checked={shutter.auto.open} onChange={(value) => onAuto('open', value)} />
        <Checkbox label={AUTO_CLOSE_LABEL} checked={shutter.auto.close} onChange={(value) => onAuto('close', value)} />
      </>
    ) : null}
    {failed === 'auto' ? <span className={ERROR_CLASS}>{AUTO_ERROR_TEXT}</span> : null}
    {failed === 'send' ? <span className={ERROR_CLASS}>{SEND_ERROR_TEXT}</span> : null}
  </div>
)

export default ShutterCard
