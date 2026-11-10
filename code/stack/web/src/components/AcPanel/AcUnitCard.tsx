import { Button } from '@house/ui'
import type { AcPatch, AcUnit } from '@/types'
import {
  BUTTONS_CLASS,
  CARD_CLASS,
  ERROR_CLASS,
  FANS,
  FAN_LABEL,
  GROUP_LABEL_CLASS,
  HEAD_CLASS,
  KNOB_OFF_CLASS,
  KNOB_ON_CLASS,
  MODES,
  MODE_LABEL,
  NAME_CLASS,
  SEND_ERROR_TEXT,
  STATE_CLASS,
  TARGET_CLASS,
  TARGET_LABEL,
  TARGET_VALUE_CLASS,
  TOGGLE_LABEL,
  TOGGLE_OFF_CLASS,
  TOGGLE_OFF_TEXT,
  TOGGLE_ON_CLASS,
  TOGGLE_ON_TEXT,
  TOGGLE_TEXT_CLASS,
  TOGGLE_WRAP_CLASS,
  UNIT_UNREACHABLE_TEXT,
  VANES,
  VANE_LABEL,
  WIDE_VANES,
  WIDE_VANE_LABEL,
} from './constants'
import { degrees, stateText, stepTarget } from './helpers'

interface AcUnitCardProps {
  unit: AcUnit
  /** Un ordre est en route pour cette unité : ses boutons sont grisés. */
  busy: boolean
  /** Le dernier ordre a échoué. */
  failed: boolean
  /** Un changement (alimentation, mode, consigne, ventilateur, ailette). */
  onChange: (patch: AcPatch) => void
}

/** Le bloc d'une climatisation : son nom et l'interrupteur On / Off, son état, le mode, la consigne (− / +), le ventilateur et l'ailette. Le même dans l'onglet Clim et dans l'aperçu de la carte. */
const AcUnitCard = ({ unit, busy, failed, onChange }: AcUnitCardProps) => {
  const target = unit.targetTemp
  // Sans consigne connue, − et + sont grisés et n'envoient rien.
  const step = (direction: -1 | 1) => (target === null ? undefined : () => onChange({ temperature: stepTarget(target, direction) }))
  return (
    <div className={CARD_CLASS}>
      <div className={HEAD_CLASS}>
        <span className={NAME_CLASS}>{unit.name}</span>
        {unit.reachable ? (
          <div className={TOGGLE_WRAP_CLASS}>
            <span className={TOGGLE_TEXT_CLASS}>{unit.power ? TOGGLE_ON_TEXT : TOGGLE_OFF_TEXT}</span>
            <button
              type="button"
              role="switch"
              aria-checked={unit.power}
              aria-label={TOGGLE_LABEL}
              className={unit.power ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS}
              disabled={busy}
              onClick={() => onChange({ on: !unit.power })}
            >
              <span className={unit.power ? KNOB_ON_CLASS : KNOB_OFF_CLASS} />
            </button>
          </div>
        ) : null}
      </div>
      {unit.reachable ? (
        <>
          <span className={STATE_CLASS}>{stateText(unit)}</span>
          <span className={GROUP_LABEL_CLASS}>{MODE_LABEL}</span>
          <div className={BUTTONS_CLASS}>
            {MODES.map((mode) => (
              <Button
                key={mode.id}
                variant={unit.mode === mode.id ? 'active' : 'default'}
                disabled={busy}
                onClick={() => onChange({ mode: mode.id })}
              >
                {mode.label}
              </Button>
            ))}
          </div>
          <span className={GROUP_LABEL_CLASS}>{TARGET_LABEL}</span>
          <div className={TARGET_CLASS}>
            <Button disabled={busy || target === null} onClick={step(-1)}>
              −
            </Button>
            <span className={TARGET_VALUE_CLASS}>{degrees(unit.targetTemp)}</span>
            <Button disabled={busy || target === null} onClick={step(1)}>
              +
            </Button>
          </div>
          <span className={GROUP_LABEL_CLASS}>{FAN_LABEL}</span>
          <div className={BUTTONS_CLASS}>
            {FANS.map((fan) => (
              <Button
                key={fan.id}
                variant={unit.fan === fan.id ? 'active' : 'default'}
                disabled={busy}
                onClick={() => onChange({ fan: fan.id })}
              >
                {fan.label}
              </Button>
            ))}
          </div>
          {/* Les deux ailettes sur chaque clim, le temps de savoir laquelle chaque modèle a vraiment : haut / bas, puis gauche / droite. */}
          <span className={GROUP_LABEL_CLASS}>{VANE_LABEL}</span>
          <div className={BUTTONS_CLASS}>
            {VANES.map((vane) => (
              <Button
                key={vane.id}
                variant={unit.vane === vane.id ? 'active' : 'default'}
                disabled={busy}
                onClick={() => onChange({ vane: vane.id })}
              >
                {vane.label}
              </Button>
            ))}
          </div>
          <span className={GROUP_LABEL_CLASS}>{WIDE_VANE_LABEL}</span>
          <div className={BUTTONS_CLASS}>
            {WIDE_VANES.map((vane) => (
              <Button
                key={vane.id}
                variant={unit.wideVane === vane.id ? 'active' : 'default'}
                disabled={busy}
                onClick={() => onChange({ wideVane: vane.id })}
              >
                {vane.label}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <span className={ERROR_CLASS}>{UNIT_UNREACHABLE_TEXT}</span>
      )}
      {failed ? <span className={ERROR_CLASS}>{SEND_ERROR_TEXT}</span> : null}
    </div>
  )
}

export default AcUnitCard
