import { useEffect, useState } from 'react'
import { Button, Checkbox, Notice, SectionTitle } from '@house/ui'
import { ApiError, fetchShutters, sendShutter, setShutterAuto } from '@/lib/api'
import type { ShutterAuto, ShutterCommand, ShuttersState } from '@/types'
import {
  AUTO_CLOSE_LABEL,
  AUTO_ERROR_TEXT,
  AUTO_OPEN_LABEL,
  BOX_CLASS,
  BUTTONS_CLASS,
  CARD_CLASS,
  COMMANDS,
  ERROR_CLASS,
  LAST_CLASS,
  LIST_CLASS,
  LOADING_TEXT,
  MOCK_TEXT,
  NAME_CLASS,
  NOT_CONFIGURED_TEXT,
  POLL_MS,
  RTS_NOTE,
  SEND_ERROR_TEXT,
  TITLE,
  UNAVAILABLE_TEXT,
} from './constants'
import { lastText } from './helpers'
import type { ShuttersPanelProps } from './types'

/** L'onglet Volet : un bloc par volet roulant avec Monter, Stop et Descendre. Sens unique (Somfy RTS) : on affiche le dernier ordre, jamais une position. */
const ShuttersPanel = ({ apiKey }: ShuttersPanelProps) => {
  const [state, setState] = useState<ShuttersState | null>(null)
  // 'loading' avant la première réponse, 'none' : aucun volet configuré (503), 'off' : l'API ne répond pas.
  const [problem, setProblem] = useState<'loading' | 'none' | 'off' | null>('loading')
  // Le volet dont un ordre est en route, et celui dont le dernier ordre a échoué.
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchShutters(apiKey)
        .then((next) => {
          if (cancelled) return
          setState(next)
          setProblem(null)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setState(null)
          setProblem(error instanceof ApiError && error.status === 503 ? 'none' : 'off')
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey])

  // Change une option de l'action automatique d'un volet : la case change tout de suite, et revient en arrière si l'API refuse.
  const changeAuto = (id: string, option: keyof ShutterAuto, value: boolean) => {
    const set = (next: boolean) =>
      setState((current) =>
        current ? { ...current, shutters: current.shutters.map((candidate) => (candidate.id === id && candidate.auto ? { ...candidate, auto: { ...candidate.auto, [option]: next } } : candidate)) } : current,
      )
    setFailed(null)
    set(value)
    setShutterAuto(apiKey, id, { [option]: value }).catch(() => {
      set(!value)
      setFailed(`auto-${id}`)
    })
  }

  const send = (id: string, command: ShutterCommand) => {
    setBusy(id)
    setFailed(null)
    sendShutter(apiKey, id, command)
      .then((shutter) => setState((current) => (current ? { ...current, shutters: current.shutters.map((candidate) => (candidate.id === id ? shutter : candidate)) } : current)))
      .catch(() => setFailed(id))
      .finally(() => setBusy(null))
  }

  return (
    <section className={BOX_CLASS}>
      <SectionTitle text={TITLE} />
      {problem === 'loading' ? <Notice text={LOADING_TEXT} /> : null}
      {problem === 'none' ? <Notice text={NOT_CONFIGURED_TEXT} /> : null}
      {problem === 'off' ? <Notice text={UNAVAILABLE_TEXT} /> : null}
      {state ? (
        <>
          {state.mock ? <Notice text={MOCK_TEXT} /> : null}
          <div className={LIST_CLASS}>
            {state.shutters.map((shutter) => (
              <div key={shutter.id} className={CARD_CLASS}>
                <span className={NAME_CLASS}>{shutter.name}</span>
                <div className={BUTTONS_CLASS}>
                  {COMMANDS.map((command) => (
                    <Button key={command.id} disabled={busy === shutter.id} onClick={() => send(shutter.id, command.id)}>
                      {command.label}
                    </Button>
                  ))}
                </div>
                <span className={LAST_CLASS}>{lastText(shutter)}</span>
                {shutter.auto !== null ? (
                  <>
                    <Checkbox label={AUTO_OPEN_LABEL} checked={shutter.auto.open} onChange={(value) => changeAuto(shutter.id, 'open', value)} />
                    <Checkbox label={AUTO_CLOSE_LABEL} checked={shutter.auto.close} onChange={(value) => changeAuto(shutter.id, 'close', value)} />
                  </>
                ) : null}
                {failed === `auto-${shutter.id}` ? <span className={ERROR_CLASS}>{AUTO_ERROR_TEXT}</span> : null}
                {failed === shutter.id ? <span className={ERROR_CLASS}>{SEND_ERROR_TEXT}</span> : null}
              </div>
            ))}
          </div>
          <span className={LAST_CLASS}>{RTS_NOTE}</span>
        </>
      ) : null}
    </section>
  )
}

export default ShuttersPanel
