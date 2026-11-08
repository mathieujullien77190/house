import { useEffect, useState } from 'react'
import { Button, Checkbox, Notice, SectionTitle, SpecList } from '@house/ui'
import { ApiError, fetchPlug, setPlug } from '@/lib/api'
import type { PlugState } from '@/types'
import {
  BOX_CLASS,
  HEAD_CLASS,
  LOADING_TEXT,
  MOTION_ARMED_LABEL,
  MOTION_ARMED_TEXT,
  MOTION_LABEL,
  MODEL_LABEL,
  NAME_CLASS,
  NOT_CONFIGURED_TEXT,
  OFF_TEXT,
  ON_TEXT,
  REMAINING_LABEL,
  SIGNAL_LABEL,
  SINCE_LABEL,
  SLIDER_CLASS,
  SLIDER_HEAD_CLASS,
  STATE_LABEL,
  TIMER_BOX_CLASS,
  TIMER_DEFAULT,
  TIMER_LABEL,
  TIMER_MAX,
  TIMER_MIN,
  TIMER_START_LABEL,
  TIMER_UNIT,
  TITLE,
  TURN_OFF_LABEL,
  UNAVAILABLE_TEXT,
  VALUE_CLASS,
} from './constants'
import { countdownText, elapsedText, signalText } from './helpers'
import type { PlugPanelProps } from './types'

/** Relue la prise toutes les 5 secondes. */
const POLL_MS = 5000

/** L'onglet Prise : l'état de la prise connectée (TP-Link Kasa), un bouton pour l'allumer ou l'éteindre, et un curseur pour l'allumer un temps donné. */
const PlugPanel = ({ apiKey }: PlugPanelProps) => {
  const [plug, setState] = useState<PlugState | null>(null)
  // 'loading' avant la première réponse, 'off' : prise injoignable, 'none' : pas de prise configurée (503).
  const [problem, setProblem] = useState<'loading' | 'off' | 'none' | null>('loading')
  const [busy, setBusy] = useState(false)
  // L'option choisie, cochée au départ : en allumant, le détecteur intérieur éteint la prise au premier mouvement.
  const [offOnMotion, setOffOnMotion] = useState(true)
  // La durée choisie au curseur, en minutes.
  const [minutes, setMinutes] = useState<number>(TIMER_DEFAULT)
  // L'instant où le minuteur de la prise l'éteindra (déduit de ce que la prise a dit), et l'heure qui défile chaque seconde pour le décompte.
  const [endsAt, setEndsAt] = useState<number | null>(null)
  // L'instant où la prise s'est allumée (déduit de « allumée depuis » que la prise a dit), pour que « allumée depuis » défile aussi chaque seconde.
  const [onSince, setOnSince] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const apply = (state: PlugState) => {
    const at = Date.now()
    setState(state)
    setNow(at)
    setEndsAt(state.timerSeconds !== null ? at + state.timerSeconds * 1000 : null)
    setOnSince(state.on ? at - state.onTime * 1000 : null)
  }

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchPlug(apiKey)
        .then((state) => {
          if (cancelled) return
          apply(state)
          setProblem(null)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setState(null)
          setEndsAt(null)
          setOnSince(null)
          setProblem(error instanceof ApiError && error.status === 503 ? 'none' : 'off')
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey])

  // Le décompte et « allumée depuis » avancent chaque seconde entre deux lectures de la prise, tant qu'elle est allumée.
  const running = onSince !== null
  useEffect(() => {
    if (!running) return
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [running])

  // Éteindre : la prise ne s'allume jamais sans fin (seulement pour un temps donné), donc ce bouton ne sert qu'à l'éteindre.
  const turnOff = () => {
    setBusy(true)
    setPlug(apiKey, false)
      .then(apply)
      .catch(() => setProblem('off'))
      .finally(() => setBusy(false))
  }

  // Allumer pendant N minutes : c'est la prise qui s'éteint ensuite, même si le mini PC tombe.
  const startTimer = () => {
    setBusy(true)
    setPlug(apiKey, true, minutes, offOnMotion)
      .then(apply)
      .catch(() => setProblem('off'))
      .finally(() => setBusy(false))
  }

  const remaining = endsAt === null ? null : Math.max(0, Math.round((endsAt - now) / 1000))
  const elapsed = onSince === null ? null : Math.max(0, Math.round((now - onSince) / 1000))

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
            {plug.on ? (
              <Button variant="active" disabled={busy} onClick={turnOff}>
                {TURN_OFF_LABEL}
              </Button>
            ) : null}
          </div>
          <Checkbox label={MOTION_LABEL} checked={offOnMotion} onChange={setOffOnMotion} />
          <div className={TIMER_BOX_CLASS}>
            <div className={SLIDER_HEAD_CLASS}>
              <span>{TIMER_LABEL}</span>
              <span className={VALUE_CLASS}>
                {minutes} {TIMER_UNIT}
              </span>
            </div>
            <input
              type="range"
              min={TIMER_MIN}
              max={TIMER_MAX}
              step={1}
              value={minutes}
              aria-label={TIMER_LABEL}
              className={SLIDER_CLASS}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
            <Button disabled={busy} onClick={startTimer}>
              {TIMER_START_LABEL} {minutes} {TIMER_UNIT}
            </Button>
          </div>
          <SpecList
            items={[
              { id: 'state', label: STATE_LABEL, value: plug.on ? ON_TEXT : OFF_TEXT },
              ...(plug.on && remaining !== null ? [{ id: 'timer', label: REMAINING_LABEL, value: countdownText(remaining) }] : []),
              ...(plug.on && elapsed !== null ? [{ id: 'since', label: SINCE_LABEL, value: elapsedText(elapsed) }] : []),
              ...(plug.on && plug.offOnMotion ? [{ id: 'motion', label: MOTION_ARMED_LABEL, value: MOTION_ARMED_TEXT }] : []),
              { id: 'signal', label: SIGNAL_LABEL, value: signalText(plug.rssi) },
              { id: 'model', label: MODEL_LABEL, value: plug.model },
            ]}
          />
        </>
      ) : null}
    </section>
  )
}

export default PlugPanel
