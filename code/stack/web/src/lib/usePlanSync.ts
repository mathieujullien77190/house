// Garde le plan de la mosaïque d'accord avec House API : au montage il prend le plan de l'API (ou lui envoie celui de l'appareil), puis il envoie chaque changement local
// (vérifié toutes les 2 s). `version` change quand le plan de l'API a remplacé celui de l'appareil : le parent remonte alors ses hooks pour qu'ils le relisent.
import { useEffect, useState } from 'react'
import { pushIfChanged, startSync } from '@/lib/planSync'

const CHECK_MS = 2000

export const usePlanSync = (apiKey: string): number => {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    let last = ''
    let timer: ReturnType<typeof setInterval> | undefined
    void startSync(apiKey).then((started) => {
      if (cancelled) return
      last = started.last
      if (started.changed) setVersion((current) => current + 1)
      timer = setInterval(() => {
        void pushIfChanged(apiKey, last).then((next) => {
          last = next
        })
      }, CHECK_MS)
    })
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [apiKey])
  return version
}
