// Les caméras éteintes (PoE coupé sur le switch), toutes à la fois : une lecture de `/poe` toutes les 10 s tant que `enabled` ; la liste de leurs noms. Vide sans switch configuré, avant la
// première réponse, ou si la lecture échoue (une lecture ratée ne doit pas faire croire qu'une caméra est coupée : le dernier état reste).
import { useEffect, useState } from 'react'
import { fetchPower } from '@/lib/api'

const POLL_MS = 10_000

export const useOffCameras = (apiKey: string, enabled = true): string[] => {
  const [off, setOff] = useState<string[]>([])
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () =>
      fetchPower(apiKey)
        .then((list) => {
          if (alive) setOff(list.filter((item) => !item.on).map((item) => item.camera))
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey, enabled])
  return off
}
