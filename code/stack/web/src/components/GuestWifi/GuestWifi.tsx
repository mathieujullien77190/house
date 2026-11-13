import { useState } from 'react'
import { Button, SpecList } from '@house/ui'
import { ApiError, fetchGuestWifi } from '@/lib/api'
import type { GuestWifi as GuestWifiData } from '@/types'
import {
  ACTIONS_CLASS,
  BLOCK_CLASS,
  COPIED_TEXT,
  COPY_LABEL,
  ERROR_CLASS,
  ERROR_TEXT,
  HELP,
  HIDE_LABEL,
  LABELS,
  LOADING_TEXT,
  NONE_TEXT,
  NOTE_CLASS,
  SHOW_LABEL,
  TITLE,
  TITLE_CLASS,
} from './constants'
import type { GuestWifiProps } from './types'

type Phase = 'hidden' | 'loading' | 'shown' | 'none' | 'error'

/** Le bloc du WiFi invité de la box : son nom et son mot de passe, lu à la demande (« Afficher le mot de passe »), qu'on peut copier. Le mot de passe n'est jamais relu tout seul ni gardé une fois masqué. */
const GuestWifi = ({ apiKey }: GuestWifiProps) => {
  const [phase, setPhase] = useState<Phase>('hidden')
  const [guest, setGuest] = useState<GuestWifiData | null>(null)
  const [copied, setCopied] = useState(false)

  const show = () => {
    setPhase('loading')
    fetchGuestWifi(apiKey)
      .then((next) => {
        setGuest(next)
        setPhase('shown')
      })
      .catch((error: unknown) => setPhase(error instanceof ApiError && error.status === 404 ? 'none' : 'error'))
  }
  const hide = () => {
    setGuest(null)
    setCopied(false)
    setPhase('hidden')
  }
  const copy = (password: string) => {
    navigator.clipboard.writeText(password).then(
      () => setCopied(true),
      () => setCopied(false),
    )
  }

  return (
    <div className={BLOCK_CLASS}>
      <span className={TITLE_CLASS}>{TITLE}</span>
      <span className={NOTE_CLASS}>{HELP}</span>
      {guest ? (
        <SpecList
          items={[
            { id: 'ssid', label: LABELS.ssid, value: guest.ssid ?? '–' },
            { id: 'password', label: LABELS.password, value: guest.password },
            ...(guest.maxUses === null
              ? []
              : [
                  {
                    id: 'usage',
                    label: LABELS.usage,
                    value: `${guest.users} / ${guest.maxUses}`,
                  },
                ]),
          ]}
        />
      ) : null}
      {phase === 'loading' ? <span className={NOTE_CLASS}>{LOADING_TEXT}</span> : null}
      {phase === 'none' ? <span className={NOTE_CLASS}>{NONE_TEXT}</span> : null}
      {phase === 'error' ? <span className={ERROR_CLASS}>{ERROR_TEXT}</span> : null}
      <div className={ACTIONS_CLASS}>
        {guest ? (
          <>
            <Button onClick={() => copy(guest.password)}>{copied ? COPIED_TEXT : COPY_LABEL}</Button>
            <Button onClick={hide}>{HIDE_LABEL}</Button>
          </>
        ) : (
          <Button disabled={phase === 'loading'} onClick={show}>
            {SHOW_LABEL}
          </Button>
        )}
      </div>
    </div>
  )
}

export default GuestWifi
