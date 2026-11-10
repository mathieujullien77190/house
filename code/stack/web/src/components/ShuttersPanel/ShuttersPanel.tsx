import { useEffect, useState } from 'react'
import { Notice, SectionTitle } from '@house/ui'
import { ApiError, closeShutterHalf, fetchShutters, sendShutter, setShutterAuto } from '@/lib/api'
import type { ShutterAuto, ShutterCommand, ShuttersState } from '@/types'
import {
  BOX_CLASS,
  LIST_CLASS,
  LOADING_TEXT,
  MOCK_TEXT,
  NOT_CONFIGURED_TEXT,
  POLL_MS,
  POLL_RUNNING_MS,
  TITLE,
  UNAVAILABLE_TEXT,
} from './constants'
import ShutterCard from './ShutterCard'
import type { ShuttersPanelProps } from './types'

/** L'onglet Volet : un bloc par volet roulant avec Monter, Stop et Descendre. Sens unique (Somfy RTS) : on affiche le dernier ordre, jamais une position. */
const ShuttersPanel = ({ apiKey }: ShuttersPanelProps) => {
  const [state, setState] = useState<ShuttersState | null>(null)
  // 'loading' avant la première réponse, 'none' : aucun volet configuré (503), 'off' : l'API ne répond pas.
  const [problem, setProblem] = useState<'loading' | 'none' | 'off' | null>('loading')
  // Le volet dont un ordre est en route, et celui dont le dernier ordre a échoué.
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  // Un « Fermer à moitié » est en cours quelque part : on relit plus vite.
  const running = state?.shutters.some((shutter) => shutter.halfRunning) ?? false

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
    const timer = setInterval(load, running ? POLL_RUNNING_MS : POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey, running])

  // Change une option de l'action automatique d'un volet : la case change tout de suite, et revient en arrière si l'API refuse.
  const changeAuto = (id: string, option: keyof ShutterAuto, value: boolean) => {
    const set = (next: boolean) =>
      setState((current) =>
        current
          ? {
              ...current,
              shutters: current.shutters.map((candidate) =>
                candidate.id === id && candidate.auto ? { ...candidate, auto: { ...candidate.auto, [option]: next } } : candidate,
              ),
            }
          : current,
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
      .then((shutter) =>
        setState((current) =>
          current ? { ...current, shutters: current.shutters.map((candidate) => (candidate.id === id ? shutter : candidate)) } : current,
        ),
      )
      .catch(() => setFailed(id))
      .finally(() => setBusy(null))
  }

  // « Fermer à moitié » : l'API monte le volet à fond, attend, le redescend de moitié puis l'arrête ; ici on lance et on relit l'état.
  const half = (id: string) => {
    setBusy(id)
    setFailed(null)
    closeShutterHalf(apiKey, id)
      .then((shutter) =>
        setState((current) =>
          current ? { ...current, shutters: current.shutters.map((candidate) => (candidate.id === id ? shutter : candidate)) } : current,
        ),
      )
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
              <ShutterCard
                key={shutter.id}
                shutter={shutter}
                busy={busy === shutter.id}
                failed={failed === shutter.id ? 'send' : failed === `auto-${shutter.id}` ? 'auto' : null}
                onSend={(command) => send(shutter.id, command)}
                onHalf={() => half(shutter.id)}
                onAuto={(option, value) => changeAuto(shutter.id, option, value)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

export default ShuttersPanel
