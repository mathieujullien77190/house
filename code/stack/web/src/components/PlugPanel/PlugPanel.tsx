import { useEffect, useState } from 'react'
import { Button, Notice, SectionTitle, SpecList } from '@house/ui'
import { ApiError, fetchPlug, setPlug } from '@/lib/api'
import type { PlugState } from '@/types'
import { BOX_CLASS, HEAD_CLASS, LOADING_TEXT, MODEL_LABEL, NAME_CLASS, NOT_CONFIGURED_TEXT, NOTE, OFF_TEXT, ON_TEXT, SIGNAL_LABEL, SINCE_LABEL, STATE_LABEL, TITLE, TURN_OFF_LABEL, TURN_ON_LABEL, UNAVAILABLE_TEXT } from './constants'
import { durationText, signalText } from './helpers'
import type { PlugPanelProps } from './types'

/** Relue la prise toutes les 5 secondes. */
const POLL_MS = 5000

/** L'onglet Prise : l'état de la prise connectée (TP-Link Kasa) et un bouton pour l'allumer ou l'éteindre. */
const PlugPanel = ({ apiKey }: PlugPanelProps) => {
  const [plug, setState] = useState<PlugState | null>(null)
  // 'loading' avant la première réponse, 'off' : prise injoignable, 'none' : pas de prise configurée (503).
  const [problem, setProblem] = useState<'loading' | 'off' | 'none' | null>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchPlug(apiKey)
        .then((state) => {
          if (cancelled) return
          setState(state)
          setProblem(null)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setState(null)
          setProblem(error instanceof ApiError && error.status === 503 ? 'none' : 'off')
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey])

  const toggle = () => {
    if (!plug || busy) return
    setBusy(true)
    setPlug(apiKey, !plug.on)
      .then(setState)
      .catch(() => setProblem('off'))
      .finally(() => setBusy(false))
  }

  return (
    <section className={BOX_CLASS}>
      <SectionTitle text={TITLE} />
      {problem === 'loading' ? <Notice text={LOADING_TEXT} /> : null}
      {problem === 'none' ? <Notice text={NOT_CONFIGURED_TEXT} /> : null}
      {problem === 'off' ? <Notice text={UNAVAILABLE_TEXT} /> : null}
      {plug ? (
        <>
          <div className={HEAD_CLASS}>
            <span className={NAME_CLASS}>{plug.alias}</span>
            <Button variant={plug.on ? 'active' : 'default'} disabled={busy} onClick={toggle}>
              {plug.on ? TURN_OFF_LABEL : TURN_ON_LABEL}
            </Button>
          </div>
          <SpecList
            items={[
              { id: 'state', label: STATE_LABEL, value: plug.on ? ON_TEXT : OFF_TEXT },
              ...(plug.on ? [{ id: 'since', label: SINCE_LABEL, value: durationText(plug.onTime) }] : []),
              { id: 'signal', label: SIGNAL_LABEL, value: signalText(plug.rssi) },
              { id: 'model', label: MODEL_LABEL, value: plug.model },
            ]}
          />
          <Notice text={NOTE} />
        </>
      ) : null}
    </section>
  )
}

export default PlugPanel
