import Button from '../Button'
import Collapsible from '../Collapsible'
import {
  ALL_BUTTON_CLASS,
  ALL_KEY,
  ALL_OFF_LABEL,
  ALL_ON_LABEL,
  ALL_ROW_CLASS,
  BRIGHTNESS_LABEL,
  BUSY_LABEL,
  BUTTON_CLASS,
  GROUP_CLASS,
  LAMPS_CLASS,
  LIST_CLASS,
  MOTION_OFF_CLASS,
  MOTION_ON_CLASS,
  MUTED_CLASS,
  NAME_CLASS,
  PERCENT_CLASS,
  ROW_CLASS,
  SLIDER_CLASS,
  TURN_OFF_LABEL,
  TURN_ON_LABEL,
  UNREACHABLE_TEXT,
} from './constants'
import { briOf, countText, percentOf } from './helpers'
import type { LightsChange, LightsLamp, LightsPanelProps, LightsRoom, LightsSensor } from './types'

/** Les lumières : une section repliable par pièce, un bouton et un curseur de luminosité pour la pièce et pour chaque lampe. */
const LightsPanel = ({ rooms, busy, drafts, onAll, onRoom, onLight, onDraft, lampExtra }: LightsPanelProps) => {
  // Un bouton et un curseur : le même rendu pour une pièce entière et pour une lampe. Le curseur envoie au relâchement.
  const controls = (key: string, on: boolean, bri: number | null, disabled: boolean, change: (change: LightsChange) => void) => {
    const percent = drafts[key] ?? (bri === null ? null : percentOf(bri))
    return (
      <>
        <Button
          className={BUTTON_CLASS}
          variant={on ? 'danger' : 'active'}
          disabled={disabled || busy === key}
          onClick={() => change({ on: !on })}
        >
          {busy === key ? BUSY_LABEL : on ? TURN_OFF_LABEL : TURN_ON_LABEL}
        </Button>
        {percent === null ? null : (
          <>
            <input
              type="range"
              min={1}
              max={100}
              value={percent}
              disabled={disabled}
              aria-label={BRIGHTNESS_LABEL}
              className={SLIDER_CLASS}
              onChange={(event) => onDraft(key, Number(event.target.value))}
              onPointerUp={(event) => change({ bri: briOf(Number(event.currentTarget.value)) })}
              onKeyUp={(event) => change({ bri: briOf(Number(event.currentTarget.value)) })}
            />
            <span className={PERCENT_CLASS}>{percent} %</span>
          </>
        )}
      </>
    )
  }

  const lamp = (light: LightsLamp) => (
    <li key={light.id} className={ROW_CLASS}>
      <span className={NAME_CLASS}>
        {light.name}
        {light.reachable ? null : <span className={MUTED_CLASS}> · {UNREACHABLE_TEXT}</span>}
      </span>
      {controls(`light:${light.id}`, light.on, light.bri, !light.reachable, (change) => onLight(light.id, change))}
      {lampExtra?.(light)}
    </li>
  )

  const sensor = (item: LightsSensor) => (
    <li key={`sensor:${item.id}`} className={ROW_CLASS}>
      <span className={NAME_CLASS}>
        {item.name}
        {item.reachable ? null : <span className={MUTED_CLASS}> · {UNREACHABLE_TEXT}</span>}
      </span>
      <span className={item.motion ? MOTION_ON_CLASS : MOTION_OFF_CLASS}>{item.motionText}</span>
      {item.readings.map((reading) => (
        <span key={reading} className={MUTED_CLASS}>
          {reading}
        </span>
      ))}
    </li>
  )

  const room = (item: LightsRoom) => (
    <div key={item.id} className={GROUP_CLASS}>
      <Collapsible
        title={item.name}
        detail={countText(item)}
        compact
        // Le titre a la largeur du nom d'une lampe : le bouton et le curseur du groupe tombent dans les colonnes de ceux de ses lampes.
        headClass={NAME_CLASS}
        // Tous les groupes sont ouverts au départ, allumés ou non ; seules les lampes à placer (sans commande groupée) restent repliées.
        defaultOpen={!item.ungrouped}
        actions={item.ungrouped ? null : controls(`room:${item.id}`, item.on, item.bri, false, (change) => onRoom(item.id, change))}
      >
        <ul className={LAMPS_CLASS}>
          {item.lights.map(lamp)}
          {(item.sensors ?? []).map(sensor)}
        </ul>
      </Collapsible>
    </div>
  )

  return (
    <div className={LIST_CLASS}>
      <div className={ALL_ROW_CLASS}>
        <Button className={ALL_BUTTON_CLASS} variant="active" disabled={busy === ALL_KEY} onClick={() => onAll(true)}>
          {ALL_ON_LABEL}
        </Button>
        <Button className={ALL_BUTTON_CLASS} variant="danger" disabled={busy === ALL_KEY} onClick={() => onAll(false)}>
          {ALL_OFF_LABEL}
        </Button>
      </div>
      {rooms.map(room)}
    </div>
  )
}

export default LightsPanel
