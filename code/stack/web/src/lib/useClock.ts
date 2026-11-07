// L'heure qui défile : un tick par seconde, seulement tant que `active` (pas de rendu inutile le reste du temps).
import { useEffect, useState } from 'react'

const TICK_MS = 1000

/** L'instant présent en secondes, relu chaque seconde tant que `active`. */
export const useClock = (active: boolean): number => {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(Math.floor(Date.now() / 1000))
    // Un premier tick tout de suite : l'heure gardée de la dernière ouverture n'est plus bonne.
    const first = setTimeout(tick, 0)
    const timer = setInterval(tick, TICK_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [active])
  return now
}

/** « 18:30:05 » : l'heure d'un instant (secondes), à l'heure de la maison, sans la date. */
export const formatClock = (seconds: number): string => new Date(seconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
