// La Freebox, partagée par l'onglet Box et l'aperçu de la carte de Home : lue toutes les 12 s ; l'interrupteur du WiFi part par `PUT /box/wifi` et la réponse de l'API remplace tout de suite l'état du WiFi.
// Une lecture qui échoue garde le dernier état lu et dit pourquoi (`problem`).
import { useEffect, useState } from 'react'
import { POLL_MS } from '@/components/BoxPanel/constants'
import { fetchBox, setBoxWifi } from '@/lib/api'
import type { BoxState } from '@/types'

/** 'loading' avant la première réponse, 'off' : l'API ne répond pas, null : tout va bien. */
export type BoxProblem = 'loading' | 'off' | null

export interface BoxHook {
  /** L'état de la box, ou null tant qu'aucune lecture n'a réussi. */
  box: BoxState | null
  problem: BoxProblem
  /** Un ordre WiFi est en route, et le dernier a échoué. */
  busy: boolean
  failed: boolean
  setWifi: (enabled: boolean) => void
}

export const useBox = (apiKey: string): BoxHook => {
  const [box, setBox] = useState<BoxState | null>(null)
  const [problem, setProblem] = useState<BoxProblem>('loading')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchBox(apiKey)
        .then((next) => {
          if (cancelled) return
          setBox(next)
          setProblem(null)
        })
        .catch(() => {
          if (!cancelled) setProblem('off')
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey])

  const setWifi = (enabled: boolean) => {
    setBusy(true)
    setFailed(false)
    setBoxWifi(apiKey, enabled)
      .then((wifi) => setBox((current) => (current ? { ...current, wifi } : current)))
      .catch(() => setFailed(true))
      .finally(() => setBusy(false))
  }

  return { box, problem, busy, failed, setWifi }
}
