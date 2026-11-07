import { useEffect, useState } from 'react'
import { ApiError, fetchPower } from '@/lib/api'
import type { CameraPower } from '@/types'

/** Lecture de l'alimentation de chaque caméra ; null sans switch configuré (503). Une erreur passagère garde le dernier état connu. */
const POLL_MS = 10_000
/** Pendant un démarrage ou une extinction, on relit plus souvent pour voir la fin. */
const TRANSITION_POLL_MS = 3000

/** L'alimentation d'une caméra, lue sur le switch, et de quoi la remplacer dès qu'on la change. */
export const usePower = (apiKey: string, camera: string) => {
  const [power, setPower] = useState<CameraPower | null>(null)
  // Le switch est configuré mais ne répond pas (compte refusé, hors ligne) : le bouton se montre grisé au lieu de disparaître.
  const [failed, setFailed] = useState(false)
  // Courant mis mais flux pas encore là (démarrage), ou courant coupé mais pas encore tombé (extinction).
  const changing = power !== null && (power.on ? !power.streaming : power.powered)
  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchPower(apiKey)
        .then((list) => {
          if (cancelled) return
          setPower(list.find((item) => item.camera === camera) ?? null)
          setFailed(false)
        })
        .catch((error: unknown) => {
          // Le dernier état reste (une lecture ratée ne doit pas faire croire que la caméra est coupée). 503 : pas de switch configuré, rien à montrer.
          if (!cancelled) setFailed(!(error instanceof ApiError && error.status === 503))
        })
    load()
    const timer = setInterval(load, changing ? TRANSITION_POLL_MS : POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey, camera, changing])
  return { power, setPower, failed }
}
