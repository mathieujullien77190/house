// L'extinction en douceur d'une lampe (le pont fait descendre la luminosité en 15 minutes puis l'éteint) : le bouton la lance ou l'annule ; l'état (et l'heure de fin) vient du pont, via House API.
import { useCallback, useEffect, useState } from 'react'
import { cancelFade, fetchFade, startFade, type FadeState } from '@/lib/api'

/** Pendant l'extinction : l'état est relu toutes les 10 s (elle peut avoir été annulée ailleurs) et le temps restant défile chaque seconde. */
const POLL_MS = 10_000
const TICK_MS = 1000

export const useFade = (apiKey: string, lampId: string | undefined, enabled: boolean) => {
  const [state, setState] = useState<FadeState>({ fading: false, ends_at: null })
  const [now, setNow] = useState(() => Date.now() / 1000)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const active = enabled && lampId !== undefined

  useEffect(() => {
    if (!active || lampId === undefined) return
    let cancelled = false
    const read = () =>
      fetchFade(apiKey, lampId).then(
        (next) => {
          if (!cancelled) setState(next)
        },
        () => undefined,
      )
    void read()
    const poll = setInterval(() => void read(), POLL_MS)
    const tick = setInterval(() => setNow(Date.now() / 1000), TICK_MS)
    return () => {
      cancelled = true
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [active, apiKey, lampId])

  const toggle = useCallback(async () => {
    if (lampId === undefined) return
    setBusy(true)
    setFailed(false)
    try {
      setState(await (state.fading ? cancelFade(apiKey, lampId) : startFade(apiKey, lampId)))
      setNow(Date.now() / 1000)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }, [apiKey, lampId, state.fading])

  const remaining = state.fading && state.ends_at !== null ? Math.max(0, Math.round(state.ends_at - now)) : null
  return { fading: state.fading, remaining, busy, failed, toggle }
}
