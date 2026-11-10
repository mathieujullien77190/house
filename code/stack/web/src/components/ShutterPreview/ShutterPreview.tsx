import { useEffect, useState } from 'react'
import ShutterCard from '@/components/ShuttersPanel/ShutterCard'
import { closeShutterHalf, fetchShutters, sendShutter, setShutterAuto } from '@/lib/api'
import type { ShutterAuto, ShutterCommand, ShutterInfo } from '@/types'
import { LOADING_TEXT, NOTE_CLASS, POLL_MS, POLL_RUNNING_MS, UNKNOWN_TEXT } from './constants'
import type { ShutterPreviewProps } from './types'

/**
 * L'aperçu d'un volet roulant sur la carte (un clic sur son icône) : **le même bloc que dans l'onglet Volet** (Monter, Stop, Descendre, Fermer à moitié, le dernier ordre, l'action
 * automatique). L'état est relu toutes les 10 s ; après un ordre, la réponse de l'API s'affiche tout de suite.
 */
const ShutterPreview = ({ apiKey, shutterId }: ShutterPreviewProps) => {
  const [shutters, setShutters] = useState<ShutterInfo[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<'send' | 'auto' | null>(null)
  const shutter = shutters.find((candidate) => candidate.id === shutterId)
  const running = shutter?.halfRunning ?? false

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchShutters(apiKey)
        .then((state) => {
          if (cancelled) return
          setShutters(state.shutters)
          setLoaded(true)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, running ? POLL_RUNNING_MS : POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey, running])

  const replace = (next: ShutterInfo) => setShutters((current) => current.map((candidate) => (candidate.id === next.id ? next : candidate)))
  const run = (order: Promise<ShutterInfo>) => {
    setBusy(true)
    setFailed(null)
    order
      .then(replace)
      .catch(() => setFailed('send'))
      .finally(() => setBusy(false))
  }
  const changeAuto = (option: keyof ShutterAuto, value: boolean) => {
    const set = (next: boolean) =>
      setShutters((current) =>
        current.map((candidate) =>
          candidate.id === shutterId ? { ...candidate, auto: { open: false, close: false, ...candidate.auto, [option]: next } } : candidate,
        ),
      )
    setFailed(null)
    set(value)
    setShutterAuto(apiKey, shutterId, { [option]: value }).catch(() => {
      set(!value)
      setFailed('auto')
    })
  }

  return shutter ? (
    <ShutterCard
      shutter={shutter}
      busy={busy}
      failed={failed}
      onSend={(command: ShutterCommand) => run(sendShutter(apiKey, shutterId, command))}
      onHalf={() => run(closeShutterHalf(apiKey, shutterId))}
      onAuto={changeAuto}
    />
  ) : (
    <span className={NOTE_CLASS}>{loaded ? UNKNOWN_TEXT : LOADING_TEXT}</span>
  )
}

export default ShutterPreview
