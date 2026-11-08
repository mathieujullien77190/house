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
  DIMMABLE_LIST_CLASS,
  DIMMABLE_ROW_CLASS,
  GRID_CLASS,
  GROUP_CLASS,
  LIST_CLASS,
  MOTION_OFF_CLASS,
  MOTION_ON_CLASS,
  MUTED_CLASS,
  NAME_CLASS,
  OFF_LABEL,
  ON_LABEL,
  PERCENT_CLASS,
  ROW_CLASS,
  SENSORS_CLASS,
  SLIDER_CLASS,
  TILE_BUTTON_CLASS,
  TILE_CLASS,
  TILE_NAME_CLASS,
  TILE_OFF_CLASS,
  TILE_ON_CLASS,
  TILE_STATE_CLASS,
  UNREACHABLE_TEXT,
  ZONE_BUTTON_CLASS,
} from './constants'
import { briOf, countText, MAX_BRI, percentOf } from './helpers'
import type { LightsLamp, LightsPanelProps, LightsRoom, LightsSensor } from './types'

/** Les lumières : un rectangle par zone, une petite case ON / OFF par lampe (allumer = puissance max), un curseur seulement pour les lampes `dimmable`. */
const LightsPanel = ({ rooms, busy, drafts, dimmable = [], onAll, onRoom, onLight, onDraft, lampExtra }: LightsPanelProps) => {
  // Une case : un bouton qui bascule la lampe. Allumer envoie toujours la puissance max.
  const tile = (light: LightsLamp) => {
    const key = `light:${light.id}`
    return (
      <li key={light.id} className={TILE_CLASS}>
        <button
          type="button"
          className={`${TILE_BUTTON_CLASS} ${light.on ? TILE_ON_CLASS : TILE_OFF_CLASS}`}
          aria-pressed={light.on}
          aria-label={`${light.name} ${light.on ? ON_LABEL : OFF_LABEL}`}
          disabled={!light.reachable || busy === key}
          onClick={() => onLight(light.id, light.on ? { on: false } : { on: true, bri: MAX_BRI })}
        >
          <span className={TILE_NAME_CLASS} title={light.name}>
            {light.name}
          </span>
          <span className={TILE_STATE_CLASS}>{busy === key ? BUSY_LABEL : light.reachable ? (light.on ? ON_LABEL : OFF_LABEL) : UNREACHABLE_TEXT}</span>
        </button>
        {dimmable.includes(light.id) ? null : lampExtra?.(light)}
      </li>
    )
  }

  // Une lampe à curseur : nom, curseur (envoi au relâchement), pourcentage, et ce que le parent ajoute.
  const dimmableRow = (light: LightsLamp) => {
    const percent = drafts[`light:${light.id}`] ?? (light.bri === null ? null : percentOf(light.bri))
    return (
      <li key={light.id} className={DIMMABLE_ROW_CLASS}>
        <span className={NAME_CLASS}>{light.name}</span>
        {percent === null ? null : (
          <>
            <input
              type="range"
              min={1}
              max={100}
              value={percent}
              disabled={!light.reachable}
              aria-label={`${BRIGHTNESS_LABEL} ${light.name}`}
              className={SLIDER_CLASS}
              onChange={(event) => onDraft(`light:${light.id}`, Number(event.target.value))}
              onPointerUp={(event) => onLight(light.id, { bri: briOf(Number(event.currentTarget.value)) })}
              onKeyUp={(event) => onLight(light.id, { bri: briOf(Number(event.currentTarget.value)) })}
            />
            <span className={PERCENT_CLASS}>{percent} %</span>
          </>
        )}
        {lampExtra?.(light)}
      </li>
    )
  }

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

  // Les deux petits boutons de la zone : ON (puissance max) et OFF.
  const zoneButtons = (item: LightsRoom) => {
    const key = `room:${item.id}`
    return (
      <>
        <Button className={ZONE_BUTTON_CLASS} variant="active" disabled={busy === key} onClick={() => onRoom(item.id, { on: true, bri: MAX_BRI })}>
          {ON_LABEL}
        </Button>
        <Button className={ZONE_BUTTON_CLASS} variant="danger" disabled={busy === key} onClick={() => onRoom(item.id, { on: false })}>
          {OFF_LABEL}
        </Button>
      </>
    )
  }

  const room = (item: LightsRoom) => {
    const sliders = item.lights.filter((light) => dimmable.includes(light.id))
    const sensors = item.sensors ?? []
    return (
      <div key={item.id} className={GROUP_CLASS}>
        <Collapsible
          title={item.name}
          detail={countText(item)}
          compact
          // Toutes les zones sont ouvertes au départ ; seules les lampes à placer (sans commande groupée) restent repliées.
          defaultOpen={!item.ungrouped}
          actions={item.ungrouped ? null : zoneButtons(item)}
        >
          <ul className={GRID_CLASS}>{item.lights.map(tile)}</ul>
          {sliders.length === 0 ? null : <ul className={DIMMABLE_LIST_CLASS}>{sliders.map(dimmableRow)}</ul>}
          {sensors.length === 0 ? null : <ul className={SENSORS_CLASS}>{sensors.map(sensor)}</ul>}
        </Collapsible>
      </div>
    )
  }

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
