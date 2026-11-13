import { Button, SimpleTable, StatusFrame } from '@house/ui'
import DeviceIcon from '@/components/DeviceIcon'
import {
  ACTION_CLASS,
  BLOCK_CLASS,
  BLOCK_TITLE_CLASS,
  ERROR_CLASS,
  EXCLUDE_HINT,
  EXCLUDE_TEXT,
  GUEST_COLUMNS,
  GUESTS_TITLE,
  NO_GUEST_TEXT,
  READMIT_TEXT,
  SCROLL_CLASS,
  STATE_CLASS,
} from './constants'
import { guestCells } from './helpers'
import type { GuestsBlockProps } from './types'

/** Le bloc « Appareils invités » : le tableau des invités (tout appareil hors de la maison) avec « Exclure » (sans confirmation : « Réadmettre » l'annule) / « Réadmettre ». */
const GuestsBlock = ({ guests, busy, error, onExclude }: GuestsBlockProps) => {
  // Seulement les invités connectés, et les exclus (qui ne sont pas connectés : le bouton « Réadmettre » reste à portée).
  const shown = guests.guests.filter((guest) => guest.active || guest.excluded)
  const actions = (mac: string, excluded: boolean | null) => (
    <div className={ACTION_CLASS}>
      {excluded ? (
        <Button disabled={busy === mac} onClick={() => onExclude(mac, false)}>
          {READMIT_TEXT}
        </Button>
      ) : (
        <Button disabled={busy === mac} title={EXCLUDE_HINT} onClick={() => onExclude(mac, true)}>
          {EXCLUDE_TEXT}
        </Button>
      )}
    </div>
  )
  return (
    <StatusFrame tone="ok">
      <div className={BLOCK_CLASS}>
        <span className={BLOCK_TITLE_CLASS}>{GUESTS_TITLE}</span>
        {error ? <span className={ERROR_CLASS}>{error}</span> : null}
        {shown.length === 0 ? (
          <span className={STATE_CLASS}>{NO_GUEST_TEXT}</span>
        ) : (
          <div className={SCROLL_CLASS}>
            <SimpleTable
              columns={GUEST_COLUMNS}
              rows={shown.map((guest) => {
                const [name, ip, ...rest] = guestCells(guest)
                return [name, ip, <DeviceIcon key="type" device={guest} />, ...rest, actions(guest.mac, guest.excluded)]
              })}
              keys={shown.map((guest) => guest.mac)}
            />
          </div>
        )}
      </div>
    </StatusFrame>
  )
}

export default GuestsBlock
