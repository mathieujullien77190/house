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
  GRID_CLASS,
  GROUP_CLASS,
  LIST_CLASS,
  MOTION_OFF_CLASS,
  MOTION_ON_CLASS,
  MUTED_CLASS,
  NAME_CLASS,
  OFF_LABEL,
  ON_LABEL,
  ROW_CLASS,
  SENSORS_CLASS,
  TILE_BOX_CLASS,
  TILE_BUTTON_CLASS,
  TILE_CLASS,
  TILE_NAME_CLASS,
  TILE_SLIDER_CLASS,
  TILE_OFF_CLASS,
  TILE_BULB_CLASS,
  TILE_STATE_CLASS,
  UNREACHABLE_TEXT,
  ZONE_BUTTON_CLASS,
} from './constants'
import { BULB_PATH, briOf, countText, MAX_BRI, orangeShare, percentOf } from './helpers'
import type { LightsLamp, LightsPanelProps, LightsRoom, LightsSensor } from './types'

/** Les lumières : un rectangle par zone, une petite case ON / OFF par lampe (allumer = puissance max) avec **un curseur de luminosité dans le bloc de la lampe** (la petite ampoule en haut à droite dit l'état : sa couleur pâlit quand la luminosité baisse). */
const LightsPanel = ({ rooms, busy, drafts, onAll, onRoom, onLight, onDraft, lampExtra }: LightsPanelProps) => {
  // Une case : un bouton qui bascule la lampe. Allumer envoie toujours la puissance max.
  const tile = (light: LightsLamp) => {
    const key = `light:${light.id}`
    // La petite ampoule en haut à droite du bloc : orange (ou la couleur de la lampe) allumée, et son jaune s'éclaircit quand la luminosité baisse (le curseur en cours compte tout de suite) ; grise éteinte, rouge injoignable.
    const percent = light.bri === null ? null : (drafts[key] ?? percentOf(light.bri))
    const bulbColor = !light.reachable
      ? 'var(--color-danger)'
      : !light.on
        ? 'var(--color-muted)'
        : `color-mix(in srgb, ${light.color ?? 'var(--color-orange)'} ${percent === null ? 100 : orangeShare(percent)}%, white)`
    return (
      <li key={light.id} className={TILE_CLASS}>
        {/* Le bloc de la lampe : son bouton ON / OFF et, dedans, son curseur de luminosité. */}
        <div
          className={`${TILE_BOX_CLASS} ${TILE_OFF_CLASS}`}
          // Allumée : la bordure du bloc est jaune, de la couleur de l'ampoule, et pâlit avec la luminosité.
          style={light.on && light.reachable ? { borderColor: bulbColor } : undefined}
        >
          {/* Le même rond que sur la carte : fond blanc, bordure noire, l'ampoule dedans (sa couleur pâlit avec la luminosité). */}
          <svg className={TILE_BULB_CLASS} viewBox="0 0 24 24" aria-hidden="true" data-testid={`bulb-${light.id}`}>
            <circle cx="12" cy="12" r="10.6" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
            <g transform="translate(6.2 5.2) scale(0.52)" style={{ color: bulbColor }}>
              <path d={BULB_PATH} fill="currentColor" stroke="#000" strokeWidth={1.6} />
              <rect x="9" y="19" width="6" height="2.2" rx="1" fill="currentColor" stroke="#000" strokeWidth={1.6} />
            </g>
          </svg>
          <button
            type="button"
            className={TILE_BUTTON_CLASS}
            aria-pressed={light.on}
            aria-label={`${light.name} ${light.on ? ON_LABEL : OFF_LABEL}`}
            disabled={!light.reachable || busy === key}
            onClick={() => onLight(light.id, light.on ? { on: false } : { on: true, bri: MAX_BRI })}
          >
            <span className={TILE_NAME_CLASS} title={light.name}>
              {light.name}
            </span>
            <span className={TILE_STATE_CLASS}>
              {busy === key ? BUSY_LABEL : light.reachable ? (light.on ? ON_LABEL : OFF_LABEL) : UNREACHABLE_TEXT}
            </span>
          </button>
          {light.bri === null ? null : (
            <input
              type="range"
              min={1}
              max={100}
              value={drafts[key] ?? percentOf(light.bri)}
              disabled={!light.reachable}
              title={`${drafts[key] ?? percentOf(light.bri)} %`}
              aria-label={`${BRIGHTNESS_LABEL} ${light.name}`}
              className={TILE_SLIDER_CLASS}
              onChange={(event) => onDraft(`light:${light.id}`, Number(event.target.value))}
              onPointerUp={(event) => onLight(light.id, { bri: briOf(Number(event.currentTarget.value)) })}
              onKeyUp={(event) => onLight(light.id, { bri: briOf(Number(event.currentTarget.value)) })}
            />
          )}
        </div>
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
        <Button
          className={ZONE_BUTTON_CLASS}
          variant="active"
          disabled={busy === key}
          onClick={() => onRoom(item.id, { on: true, bri: MAX_BRI })}
        >
          {ON_LABEL}
        </Button>
        <Button className={ZONE_BUTTON_CLASS} variant="danger" disabled={busy === key} onClick={() => onRoom(item.id, { on: false })}>
          {OFF_LABEL}
        </Button>
      </>
    )
  }

  const room = (item: LightsRoom) => {
    const sensors = item.sensors ?? []
    return (
      <div key={item.id} className={GROUP_CLASS}>
        <Collapsible
          title={item.name}
          detail={countText(item)}
          compact
          // Toutes les zones sont ouvertes au départ.
          defaultOpen
          actions={zoneButtons(item)}
        >
          <ul className={GRID_CLASS}>{item.lights.map(tile)}</ul>
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
