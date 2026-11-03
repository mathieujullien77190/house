import type { LightsRoom, PlanLamp } from '@house/ui'
import type { HueLight, HueRoom } from '@/types'
import {
  LAMP_POSITIONS,
  LEGACY_STORAGE_KEY,
  OTHER_ZONE,
  OTHER_ZONE_NAME,
  SIDE_COLUMN_WIDTH,
  SIDE_ROW_HEIGHT,
  SIDE_ROWS,
  SIDE_TOP,
  SIDE_ZONE,
  ZONES,
} from './constants'
import type { Positions } from './types'

/** Toutes les lampes du pont (une seule fois chacune), dans l'ordre de leur identifiant. */
export const allLights = (rooms: HueRoom[]): HueLight[] => {
  const byId = new Map<string, HueLight>()
  for (const room of rooms) for (const light of room.lights) byId.set(light.id, light)
  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id))
}

const toZone = (id: string, name: string, lights: HueLight[]): LightsRoom => ({
  id,
  name,
  on: lights.some((light) => light.on),
  // La luminosité affichée pour la zone : celle de la première lampe allumée, sinon de la première qui en a une.
  bri: (lights.find((light) => light.on && light.bri !== null) ?? lights.find((light) => light.bri !== null))?.bri ?? null,
  lights,
})

/** Les zones de la maison avec leurs lampes (celles que le pont connaît), puis « Autres » pour les lampes sans zone. */
export const buildZones = (lights: HueLight[]): LightsRoom[] => {
  const byId = new Map(lights.map((light) => [light.id, light]))
  const used = new Set<string>()
  const zones = ZONES.map((zone) => {
    const members = zone.lights.map((id) => byId.get(id)).filter((light): light is HueLight => light !== undefined)
    members.forEach((light) => used.add(light.id))
    return toZone(zone.id, zone.name, members)
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
