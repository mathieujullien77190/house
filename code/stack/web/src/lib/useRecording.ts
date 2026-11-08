// Le clip enregistré à la main d'une caméra : le bouton « Enregistrer » ouvre un mouvement fictif chez l'enregistreur, « Arrêter » le ferme (il s'arrête seul au bout de 3 minutes), et le
// clip se fait puis se copie comme celui d'un vrai mouvement ; il est sauvegardé d'office. L'état vient de l'enregistreur (via House API), relu pendant l'enregistrement.
import { useCallback, useEffect, useState } from 'react'
import { fetchRecording, startRecording, stopRecording } from '@/lib/api'

/** Pendant un enregistrement : l'état est relu toutes les 5 s (l'arrêt automatique arrive tout seul) et le temps écoulé défile chaque seconde. */
const POLL_MS = 5000
const TICK_MS = 1000

export const useRecording = (apiKey: string, camera: string, enabled: boolean) => {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now() / 1000)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  // Un clip vient d'être arrêté : il se fabrique (environ une minute).
  const [stopped, setStopped] = useState(false)

  // Vrai ou faux selon l'enregistreur ; `null` quand la relecture échoue (réseau) : on ne sait pas, l'enregistrement continue peut-être.
  const refresh = useCallback(async (): Promise<boolean | null> => {
    try {
      const state = await fetchRecording(apiKey, camera)
      setStartedAt(state.recording ? state.started_at : null)
      return state.recording
    } catch {
      return null
    }
  }, [apiKey, camera])

  // L'état au départ (une page rouverte retrouve un enregistrement en cours), puis pendant l'enregistrement.
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchRecording(apiKey, camera).then(
      (state) => {
        if (!cancelled) setStartedAt(state.recording ? state.started_at : null)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [enabled, apiKey, camera])
  const recording = startedAt !== null
  useEffect(() => {
    if (!enabled || !recording) return
    const poll = setInterval(() => void refresh().then((still) => still === false && setStopped(true)), POLL_MS)
    const tick = setInterval(() => setNow(Date.now() / 1000), TICK_MS)
    return () => {
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [enabled, recording, refresh])
  useEffect(() => {
    if (!stopped) return
    const timer = setTimeout(() => setStopped(false), 10_000)
    return () => clearTimeout(timer)
  }, [stopped])

  const toggle = useCallback(async () => {
    setBusy(true)
    setFailed(false)
    try {
      if (recording) {
        await stopRecording(apiKey, camera)
        setStartedAt(null)
        setStopped(true)
      } else {
        await startRecording(apiKey, camera)
        setStopped(false)
        await refresh()
        setNow(Date.now() / 1000)
      }
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }, [apiKey, camera, recording, refresh])

  return { recording, seconds: startedAt === null ? 0 : Math.max(0, Math.round(now - startedAt)), busy, failed, stopped, toggle }
}
