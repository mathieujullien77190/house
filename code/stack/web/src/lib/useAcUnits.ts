// Les climatisations, partagées par l'onglet Clim et l'aperçu de la carte de Home : lues toutes les 10 s, un changement part par `POST /ac/<id>` et la réponse de l'API (l'unité avec le changement appliqué) remplace tout de suite l'unité.
// Une lecture qui échoue garde la dernière liste lue et dit pourquoi (`problem`) : l'onglet Clim n'affiche alors que le message, l'aperçu garde son bloc.
import { useEffect, useState } from 'react'
import { POLL_MS } from '@/components/AcPanel/constants'
import { ApiError, fetchAc, setAc } from '@/lib/api'
import type { AcPatch, AcUnit } from '@/types'

/** 'loading' avant la première réponse, 'none' : aucune unité configurée (503), 'off' : l'API ne répond pas, null : tout va bien. */
export type AcProblem = 'loading' | 'none' | 'off' | null

export interface AcUnits {
  /** Les unités, ou null tant qu'aucune lecture n'a réussi. */
  units: AcUnit[] | null
  problem: AcProblem
  /** L'unité dont un ordre est en route, et celle dont le dernier ordre a échoué. */
  busy: string | null
  failed: string | null
  /** Un changement (alimentation, mode, consigne, ventilateur, ailette). */
  change: (id: string, patch: AcPatch) => void
}

export const useAcUnits = (apiKey: string): AcUnits => {
  const [units, setUnits] = useState<AcUnit[] | null>(null)
  const [problem, setProblem] = useState<AcProblem>('loading')
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchAc(apiKey)
        .then((next) => {
          if (cancelled) return
          setUnits(next)
          setProblem(null)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setProblem(error instanceof ApiError && error.status === 503 ? 'none' : 'off')
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey])

  const change = (id: string, patch: AcPatch) => {
    setBusy(id)
    setFailed(null)
    setAc(apiKey, id, patch)
      .then((unit) => setUnits((current) => (current ? current.map((candidate) => (candidate.id === id ? unit : candidate)) : current)))
      .catch(() => setFailed(id))
      .finally(() => setBusy(null))
  }

  return { units, problem, busy, failed, change }
}
