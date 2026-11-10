// La température de la maison pour la barre du haut : celle de la pièce du salon, lue par sa climatisation (`/ac`), relue toutes les 30 s ; null avant la première réponse, sans
// climatisation du salon, ou si son module ne répond pas.
import { useEffect, useState } from 'react'
import { fetchAc } from '@/lib/api'

const REFRESH_MS = 30_000
/** L'identifiant de la climatisation du salon (`AC_UNITS`). */
const LIVING_ROOM_UNIT = 'salon'

export const useHomeTemperature = (apiKey: string): number | null => {
  const [temperature, setTemperature] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    const load = () =>
      fetchAc(apiKey)
        .then((units) => {
          if (alive) setTemperature(units.find((unit) => unit.id === LIVING_ROOM_UNIT && unit.reachable)?.roomTemp ?? null)
        })
        .catch(() => {
          if (alive) setTemperature(null)
        })
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey])
  return temperature
}
