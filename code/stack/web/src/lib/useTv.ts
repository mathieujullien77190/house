// La télécommande TV, pour l'onglet Box TV : l'état (`GET /tv`, relu toutes les 10 s), l'envoi d'une touche (`POST /tv/key`) et l'association du Player (code affiché sur la TV, `/tv/pair/*`).
// Une lecture qui échoue garde le dernier état lu et dit pourquoi (`problem`).
import { useEffect, useState } from 'react'
import { POLL_MS } from '@/components/TvPanel/constants'
import { isWrongCode, pairErrorText, sendErrorText } from '@/components/TvPanel/helpers'
import type { PairPhase, TvProblem } from '@/components/TvPanel/types'
import { fetchTv, finishTvPairing, sendTvKey, startTvPairing } from '@/lib/api'
import type { TvKey, TvState } from '@/types'

export interface TvHook {
  /** L'état de la télécommande, ou null tant qu'aucune lecture n'a réussi. */
  tv: TvState | null
  problem: TvProblem
  /** Le texte de la dernière touche qui n'est pas partie, null quand la dernière est partie. */
  error: string | null
  send: (key: TvKey, long: boolean) => void
  /** Où en est l'association : rien en cours, connexion au Player, code attendu, code en vérification. */
  pairPhase: PairPhase
  /** Le texte du dernier échec de l'association, null sinon. */
  pairError: string | null
  /** Demande au Player d'afficher un code sur la TV. */
  startPairing: () => void
  /** Envoie le code lu sur la TV. */
  submitCode: (code: string) => void
  /** Oublie l'association. */
}

export const useTv = (apiKey: string): TvHook => {
  const [tv, setTv] = useState<TvState | null>(null)
  const [problem, setProblem] = useState<TvProblem>('loading')
  const [error, setError] = useState<string | null>(null)
  const [pairPhase, setPairPhase] = useState<PairPhase>('idle')
  const [pairError, setPairError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchTv(apiKey)
        .then((next) => {
          if (cancelled) return
          setTv(next)
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

  const send = (key: TvKey, long: boolean) => {
    sendTvKey(apiKey, key, long)
      .then(() => setError(null))
      .catch((failure: unknown) => setError(sendErrorText(failure)))
  }

  // Appelé seulement quand l état est lu (le parcours d association n existe pas sans lui).
  const setPaired = (paired: boolean) => setTv((current) => ({ ...(current as TvState), paired }))

  const startPairing = () => {
    setPairPhase('starting')
    setPairError(null)
    startTvPairing(apiKey)
      .then(() => setPairPhase('waiting'))
      .catch((failure: unknown) => {
        setPairPhase('idle')
        setPairError(pairErrorText(failure))
      })
  }

  const submitCode = (code: string) => {
    setPairPhase('validating')
    setPairError(null)
    finishTvPairing(apiKey, code)
      .then(() => {
        setPairPhase('idle')
        setPaired(true)
      })
      .catch((failure: unknown) => {
        // code faux : on peut le ressaisir ; sinon l'association est à refaire
        setPairPhase(isWrongCode(failure) ? 'waiting' : 'idle')
        setPairError(pairErrorText(failure))
      })
  }

  return { tv, problem, error, send, pairPhase, pairError, startPairing, submitCode }
}
