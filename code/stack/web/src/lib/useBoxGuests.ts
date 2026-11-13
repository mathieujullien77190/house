// Les appareils invités de la Freebox (invités, exclusion du WiFi, dernières connexions), relus toutes les 30 s. « Ajouter à la maison » écrit dans la liste de l'API ;
// « Exclure » / « Réadmettre » passent par le filtrage MAC du WiFi de la box (API, droit « Modification des réglages »). Chaque action relit ensuite.
import { useEffect, useState } from 'react'
import { ACTION_ERRORS, GUESTS_POLL_MS } from '@/components/BoxPanel/constants'
import { ApiError, fetchBoxGuests, setBoxExcluded } from '@/lib/api'
import type { BoxGuests } from '@/types'

export interface BoxGuestsHook {
  /** Null tant qu'aucune lecture n'a réussi (ou box non configurée). */
  guests: BoxGuests | null
  /** La MAC dont une action est en route, et le texte de la dernière erreur (null si tout va bien). */
  busy: string | null
  error: string | null
  setExcluded: (mac: string, excluded: boolean) => void
}

export const useBoxGuests = (apiKey: string, enabled = true): BoxGuestsHook => {
  const [guests, setGuests] = useState<BoxGuests | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const load = () =>
      fetchBoxGuests(apiKey)
        .then((next) => {
          if (!cancelled) setGuests(next)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, GUESTS_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey, enabled, reload])

  const run = (mac: string, action: Promise<void>, failure: (status: number) => string) => {
    setBusy(mac)
    setError(null)
    action
      .then(() => setReload((count) => count + 1))
      .catch((caught: unknown) => setError(failure(caught instanceof ApiError ? caught.status : 0)))
      .finally(() => setBusy(null))
  }

  return {
    guests,
    busy,
    error,
    setExcluded: (mac, excluded) => run(mac, setBoxExcluded(apiKey, mac, excluded), (status) => (status === 409 ? ACTION_ERRORS.whitelist : ACTION_ERRORS.other)),
  }
}
