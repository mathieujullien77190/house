import type { LightsRoom, LightsSensor, PlanLamp, SpecItem } from '@house/ui'
import type { HueAutomation, HueLight, HueRoom, HueSensor } from '@/types'
import {
  CALM_TEXT,
  DARK_TEXT,
  LAMP_POSITIONS,
  LEGACY_STORAGE_KEY,
  OTHER_ZONE,
  MOTION_TEXT,
  OTHER_ZONE_NAME,
  SIDE_COLUMN_WIDTH,
  SIDE_ROW_HEIGHT,
  SIDE_ROWS,
  SIDE_TOP,
  SIDE_ZONE,
  UNKNOWN_MOTION_TEXT,
  ZONES,
} from './constants'
import type { Positions } from './types'

/** Toutes les lampes du pont (une seule fois chacune), dans l'ordre de leur identifiant. */
export const allLights = (rooms: HueRoom[]): HueLight[] => {
  const byId = new Map<string, HueLight>()
  for (const room of rooms) for (const light of room.lights) byId.set(light.id, light)
  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id))
}

/** « 02/11 15:44 » : un instant du pont (ISO, UTC) à l'heure et à la date de la maison. */
const formatSince = (iso: string): string => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Un détecteur de mouvement prêt à afficher : l'état du mouvement et ses mesures (température, luminosité, pile) déjà écrits. */
const toLightsSensor = (sensor: HueSensor): LightsSensor => ({
  id: sensor.id,
  name: sensor.name,
  motion: sensor.presence,
  motionText: sensor.presence === null ? UNKNOWN_MOTION_TEXT : sensor.presence ? MOTION_TEXT : sensor.presenceSince ? `${CALM_TEXT} ${formatSince(sensor.presenceSince)}` : 'Calme',
  readings: [
    sensor.temperature === null ? null : `${sensor.temperature.toFixed(1).replace('.', ',')} °C`,
    sensor.lux === null ? null : `${sensor.lux} lx${sensor.dark ? ` · ${DARK_TEXT}` : ''}`,
    sensor.battery === null ? null : `Pile ${sensor.battery} %`,
  ].filter((reading): reading is string => reading !== null),
  reachable: sensor.reachable,
})

const toZone = (id: string, name: string, lights: HueLight[], sensors: LightsSensor[] = []): LightsRoom => ({
  id,
  name,
  on: lights.some((light) => light.on),
  // La luminosité affichée pour la zone : celle de la première lampe allumée, sinon de la première qui en a une.
  bri: (lights.find((light) => light.on && light.bri !== null) ?? lights.find((light) => light.bri !== null))?.bri ?? null,
  lights,
  ...(sensors.length > 0 ? { sensors } : {}),
})

/** Les zones de la maison avec leurs lampes (celles que le pont connaît), puis « Autres » pour les lampes sans zone. */
export const buildZones = (lights: HueLight[], sensors: HueSensor[] = []): LightsRoom[] => {
  const byId = new Map(lights.map((light) => [light.id, light]))
  const sensorById = new Map(sensors.map((sensor) => [sensor.id, sensor]))
  const used = new Set<string>()
  const zones = ZONES.map((zone) => {
    const members = zone.lights.map((id) => byId.get(id)).filter((light): light is HueLight => light !== undefined)
    members.forEach((light) => used.add(light.id))
    const found = (zone.sensors ?? []).map((id) => sensorById.get(id)).filter((sensor): sensor is HueSensor => sensor !== undefined)
    return toZone(zone.id, zone.name, members, found.map(toLightsSensor))
  }).filter((zone) => zone.lights.length > 0)
  const rest = lights.filter((light) => !used.has(light.id))
  return rest.length > 0 ? [...zones, { ...toZone(OTHER_ZONE, OTHER_ZONE_NAME, rest), ungrouped: true }] : zones
}

/**
 * Où poser chaque ampoule tant qu'on ne l'a pas placée soi-même : celle que tu as placée (LAMP_POSITIONS), sinon dans la zone
 * « À placer » à droite de la maison, en colonnes de 10, dans l'ordre des identifiants.
 */
export const defaultPositions = (lights: HueLight[]): Positions => {
  const positions: Positions = { ...LAMP_POSITIONS }
  const waiting = lights.filter((light) => !LAMP_POSITIONS[light.id])
  const columns = Math.ceil(waiting.length / SIDE_ROWS)
  const centre = SIDE_ZONE.x + SIDE_ZONE.w / 2
  waiting.forEach((light, index) => {
    positions[light.id] = {
      x: Math.round(centre + (Math.floor(index / SIDE_ROWS) - (columns - 1) / 2) * SIDE_COLUMN_WIDTH),
      y: SIDE_TOP + (index % SIDE_ROWS) * SIDE_ROW_HEIGHT,
    }
  })
  return positions
}

/** Le nombre de lampes qui sont dans une zone de la maison : celles du groupe « À placer » ne comptent pas. */
export const placedLampCount = (rooms: HueRoom[]): number => allLights(rooms).filter((light) => ZONES.some((zone) => zone.lights.includes(light.id))).length

/** Les règles du pont pour la liste : leur nom (et « désactivée »), puis ce qu'elles font en une ligne. */
export const buildAutomationItems = (automations: HueAutomation[]): SpecItem[] =>
  automations.map((automation) => ({
    id: automation.id,
    label: `${automation.name}${automation.enabled ? '' : ' (désactivée)'}`,
    value: automation.lines.join(' · '),
  }))

/** Les ampoules du plan : la position gardée par l'API, sinon celle de départ. */
export const planLamps = (lights: HueLight[], positions: Positions, defaults: Positions): PlanLamp[] =>
  lights.map((light) => ({
    id: light.id,
    name: light.name,
    on: light.on,
    reachable: light.reachable,
    ...(positions[light.id] ?? defaults[light.id] ?? { x: 0, y: 0 }),
  }))

/** Les positions que le navigateur gardait avant que l'API ne les garde ; vide s'il n'y en a pas ou si elles sont illisibles. */
export const readLegacyPositions = (): Positions => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '{}') as unknown
    return typeof parsed === 'object' && parsed !== null ? (parsed as Positions) : {}
  } catch {
    return {}
  }
}

/** Efface celles du navigateur, une fois qu'elles sont à l'abri chez l'API. */
export const clearLegacyPositions = (): void => {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}
