// Les volets roulants, partagés par l'onglet Volet et l'aperçu de la carte de Home : lus toutes les 10 s (toutes les 2 s pendant un « Fermer à moitié »), les ordres (monter, stop, descendre, fermer à moitié)
// et les cases de l'action automatique. La réponse de l'API remplace tout de suite le volet. Une lecture qui échoue garde le dernier état lu et dit pourquoi (`problem`).
import { useEffect, useState } from 'react'
import { POLL_MS, POLL_RUNNING_MS } from '@/components/ShuttersPanel/constants'
import { ApiError, closeShutterHalf, fetchShutters, sendShutter, setShutterAuto } from '@/lib/api'
import type { ShutterAuto, ShutterCommand, ShutterInfo, ShuttersState } from '@/types'

/** 'loading' avant la première réponse, 'none' : aucun volet configuré (503), 'off' : l'API ne répond pas, null : tout va bien. */
export type ShuttersProblem = 'loading' | 'none' | 'off' | null

export interface Shutters {
  /** Les volets (et le mode simulation), ou null tant qu'aucune lecture n'a réussi. */
  state: ShuttersState | null
  problem: ShuttersProblem
  /** Le volet dont un ordre est en route, et ce qui a échoué : l'identifiant du volet (un ordre) ou `auto-<id>` (une case). */
  busy: string | null
  failed: string | null
  send: (id: string, command: ShutterCommand) => void
  half: (id: string) => void
  changeAuto: (id: string, option: keyof ShutterAuto, value: boolean) => void
}

/** Ce qui a échoué pour ce volet, tel que `ShutterCard` le montre : son ordre, sa case automatique, ou rien. */
export const failureOf = (failed: string | null, id: string): 'send' | 'auto' | null =>
  failed === id ? 'send' : failed === `auto-${id}` ? 'auto' : null

export const useShutters = (apiKey: string): Shutters => {
  const [state, setState] = useState<ShuttersState | null>(null)
  const [problem, setProblem] = useState<ShuttersProblem>('loading')
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
          setProblem(error instanceof ApiError && error.status === 503 ? 'none' : 'off')
        })
    load()
    const timer = setInterval(load, running ? POLL_RUNNING_MS : POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey, running])

  const replace = (shutter: ShutterInfo) =>
    setState((current) =>
      current
        ? { ...current, shutters: current.shutters.map((candidate) => (candidate.id === shutter.id ? shutter : candidate)) }
        : current,
    )

  const run = (id: string, order: Promise<ShutterInfo>) => {
    setBusy(id)
    setFailed(null)
    order
      .then(replace)
      .catch(() => setFailed(id))
      .finally(() => setBusy(null))
  }

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

  return {
    state,
    problem,
    busy,
    failed,
    send: (id, command) => run(id, sendShutter(apiKey, id, command)),
    // « Fermer à moitié » : l'API monte le volet à fond, attend, le redescend de moitié puis l'arrête ; ici on lance et on relit l'état.
    half: (id) => run(id, closeShutterHalf(apiKey, id)),
    changeAuto,
  }
}
