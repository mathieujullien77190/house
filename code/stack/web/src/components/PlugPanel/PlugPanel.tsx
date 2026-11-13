import { useEffect, useState } from 'react'
import { Button, Checkbox, Notice, SectionTitle, SpecList, StatusFrame } from '@house/ui'
import { ApiError, fetchPlug, setPlug } from '@/lib/api'
import HeatingSection from '@/components/HeatingSection'
import {
  CARD_CLASS,
  KNOB_OFF_CLASS,
  KNOB_ON_CLASS,
  TOGGLE_LABEL,
  TOGGLE_OFF_CLASS,
  TOGGLE_OFF_TEXT,
  TOGGLE_ON_CLASS,
  TOGGLE_ON_TEXT,
  TOGGLE_TEXT_CLASS,
  TOGGLE_WRAP_CLASS,
} from '@/components/AcPanel/constants'
import type { PlugState } from '@/types'
import {
  BOX_CLASS,
  EMBEDDED_BOX_CLASS,
  HEAD_CLASS,
  LOADING_TEXT,
  MOTION_ARMED_LABEL,
  MOTION_ARMED_TEXT,
  MOTION_LABEL,
  NAME_CLASS,
  NOT_CONFIGURED_TEXT,
  OFF_TEXT,
  ON_TEXT,
  REMAINING_LABEL,
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
  UNAVAILABLE_TEXT,
  VALUE_CLASS,
} from './constants'
import { countdownText, elapsedText } from './helpers'
import type { PlugPanelProps } from './types'

/** Relue la prise toutes les 5 secondes. */
const POLL_MS = 5000

/** L'onglet Prise : l'état de la prise connectée (TP-Link Kasa), un bouton pour l'allumer ou l'éteindre, et un curseur pour l'allumer un temps donné. */
const PlugPanel = ({ apiKey, embedded = false }: PlugPanelProps) => {
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
  // Change après chaque commande de la prise : le journal du chauffage est relu.
  const [commands, setCommands] = useState(0)

  const apply = (state: PlugState) => {
    const at = Date.now()
    setState(state)
    setNow(at)
    setEndsAt(state.timerSeconds !== null ? at + state.timerSeconds * 1000 : null)
    setOnSince(state.on ? at - state.onTime * 1000 : null)
  }

  // Une commande de la prise (éteindre, allumer pour une durée) : son résultat, puis le journal du chauffage relu.
  const applyCommand = (state: PlugState) => {
    apply(state)
    setCommands((count) => count + 1)
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
      .then(applyCommand)
      .catch(() => setProblem('off'))
      .finally(() => setBusy(false))
  }

  // Allumer pendant N minutes : c'est la prise qui s'éteint ensuite, même si le mini PC tombe.
  const startTimer = () => {
    setBusy(true)
    setPlug(apiKey, true, minutes, offOnMotion)
      .then(applyCommand)
      .catch(() => setProblem('off'))
      .finally(() => setBusy(false))
  }

  const remaining = endsAt === null ? null : Math.max(0, Math.round((endsAt - now) / 1000))
  const elapsed = onSince === null ? null : Math.max(0, Math.round((now - onSince) / 1000))

  return (
    <section className={embedded ? EMBEDDED_BOX_CLASS : BOX_CLASS}>
      {embedded ? null : <SectionTitle text={TITLE} />}
      {problem === 'loading' ? <Notice text={LOADING_TEXT} /> : null}
      {problem === 'none' ? <Notice text={NOT_CONFIGURED_TEXT} /> : null}
      {problem === 'off' ? <Notice text={UNAVAILABLE_TEXT} /> : null}
      {plug ? (
        <>
          {/* Un bloc comme celui d'une climatisation : le nom et l'interrupteur On / Off, l'état, puis les réglages. Allumer part pour la durée choisie (la prise ne reste jamais allumée sans fin). */}
          <StatusFrame tone={plug.on ? 'ok' : 'off'}>
          <div className={CARD_CLASS}>
            <div className={HEAD_CLASS}>
              <span className={NAME_CLASS}>{plug.alias}</span>
              <div className={TOGGLE_WRAP_CLASS}>
                <span className={TOGGLE_TEXT_CLASS}>{plug.on ? TOGGLE_ON_TEXT : TOGGLE_OFF_TEXT}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={plug.on}
                  aria-label={TOGGLE_LABEL}
                  className={plug.on ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS}
                  disabled={busy}
                  onClick={plug.on ? turnOff : startTimer}
                >
                  <span className={plug.on ? KNOB_ON_CLASS : KNOB_OFF_CLASS} />
                </button>
              </div>
            </div>
            <SpecList
              items={[
                { id: 'state', label: STATE_LABEL, value: plug.on ? ON_TEXT : OFF_TEXT },
                ...(plug.on && remaining !== null ? [{ id: 'timer', label: REMAINING_LABEL, value: countdownText(remaining) }] : []),
                ...(plug.on && elapsed !== null ? [{ id: 'since', label: SINCE_LABEL, value: elapsedText(elapsed) }] : []),
                ...(plug.on && plug.offOnMotion ? [{ id: 'motion', label: MOTION_ARMED_LABEL, value: MOTION_ARMED_TEXT }] : []),
              ]}
            />
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
            {/* La règle du chauffage automatique ne s'applique qu'à cette prise : elle est dans son bloc. */}
            <HeatingSection apiKey={apiKey} version={commands} compact={embedded} />
          </div>
          </StatusFrame>
        </>
      ) : null}
    </section>
  )
}

export default PlugPanel
