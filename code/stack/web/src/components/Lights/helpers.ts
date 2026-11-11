import type { LightsRoom, LightsSensor, PlanLamp, SpecItem } from '@house/ui'
import { CAMERA_LAMP } from '@/components/CameraCard/constants'
import type { HueAutomation, HueLight, HueRoom, HueSensor } from '@/types'
import {
  CALM_TEXT,
  DARK_TEXT,
  LAMP_POSITIONS,
  LEGACY_STORAGE_KEY,
  PLAN_LAMP_POSITION,
  MOTION_TEXT,
  SIDE_ZONE,
  UNKNOWN_MOTION_TEXT,
  ZONES,
} from './constants'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import type { Positions } from './types'

/**
 * Toutes les lampes du pont (une seule fois chacune), dans l'ordre de leur identifiant. Une lampe injoignable est montrée
 * éteinte, même si le pont la croit allumée : elle est coupée à l'interrupteur, donc éteinte.
 */
export const allLights = (rooms: HueRoom[]): HueLight[] => {
  const byId = new Map<string, HueLight>()
  for (const room of rooms) for (const light of room.lights) byId.set(light.id, light.reachable ? light : { ...light, on: false })
  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id))
}

/** « 02/11 15:44 » : un instant du pont (ISO, UTC) à l'heure et à la date de la maison. */
const formatSince = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Un détecteur de mouvement prêt à afficher : l'état du mouvement et ses mesures (température, luminosité, pile) déjà écrits. */
const toLightsSensor = (sensor: HueSensor): LightsSensor => ({
  id: sensor.id,
  name: sensor.name,
  motion: sensor.presence,
  motionText:
    sensor.presence === null
      ? UNKNOWN_MOTION_TEXT
      : sensor.presence
        ? MOTION_TEXT
        : sensor.presenceSince
          ? `${CALM_TEXT} ${formatSince(sensor.presenceSince)}`
          : 'Calme',
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

/** Les zones de la maison avec leurs lampes (celles que le pont connaît). Une lampe d'aucune zone n'est pas dans l'application : ni dans la liste, ni sur la carte, ni dans la consommation. */
export const buildZones = (lights: HueLight[], sensors: HueSensor[] = []): LightsRoom[] => {
  const byId = new Map(lights.map((light) => [light.id, light]))
  const sensorById = new Map(sensors.map((sensor) => [sensor.id, sensor]))
  const zones = ZONES.map((zone) => {
    const members = zone.lights.map((id) => byId.get(id)).filter((light): light is HueLight => light !== undefined)
    const found = (zone.sensors ?? []).map((id) => sensorById.get(id)).filter((sensor): sensor is HueSensor => sensor !== undefined)
    return toZone(zone.id, zone.name, members, found.map(toLightsSensor))
  }).filter((zone) => zone.lights.length > 0)
  return zones
}

/** Les règles du pont pour la liste : leur nom (et « désactivée »), puis ce qu'elles font en une ligne. */
export const buildAutomationItems = (automations: HueAutomation[]): SpecItem[] =>
  automations.map((automation) => ({
    id: automation.id,
    label: `${automation.name}${automation.enabled ? '' : ' (désactivée)'}`,
    value: automation.lines.join(' · '),
  }))

/** La lampe de la cage (« Perruche ») : sa place est celle de la carte (en unités du plan), jamais celle de l'ancien plan. */
const CAGE_LAMP = CAMERA_LAMP['voliere-interieur']

/**
 * Les ampoules de la carte, en unités du plan (le repère de la carte). La place d'une lampe, par ordre :
 * 1. celle gardée dans le plan de l'API (`items`, en longitude et latitude, déjà convertie) ;
 * 2. pour la lampe de la cage, sa place de départ sur la carte ;
 * 3. celle de l'ancien plan des lumières (`/hue/positions` et la copie du navigateur, `legacy`), convertie à la lecture ; elle n'est jamais effacée ni réécrite ;
 *    une position dans l'ancienne zone « À placer » (x au-delà de `SIDE_ZONE.x`) compte pour « pas placée » ;
 * 4. celle de `LAMP_POSITIONS` (l'ancien plan, convertie) ;
 * 5. sinon elle n'est pas sur la carte (une lampe qu'on n'a jamais placée ne se voit nulle part).
 */
export const planLamps = (lights: HueLight[], items: Positions, legacy: Positions): PlanLamp[] => {
  return lights.flatMap((light): PlanLamp[] => {
    const common = {
      id: light.id,
      name: light.name,
      on: light.on,
      reachable: light.reachable,
      brightness: light.bri,
      color: light.color ?? null,
    }
    const kept = items[light.id]
    if (kept) return [{ ...common, ...kept, indoor: light.id !== CAGE_LAMP }]
    if (light.id === CAGE_LAMP) return [{ ...common, ...PLAN_LAMP_POSITION }]
    const old = legacy[light.id] ?? LAMP_POSITIONS[light.id]
    return old && old.x < SIDE_ZONE.x ? [{ ...common, ...fromHousePlan(old.x, old.y), indoor: true }] : []
  })
}

/** Les positions que le navigateur gardait avant que l'API ne les garde ; vide s'il n'y en a pas ou si elles sont illisibles. */
export const readLegacyPositions = (): Positions => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '{}') as unknown
    return typeof parsed === 'object' && parsed !== null ? (parsed as Positions) : {}
  } catch {
    return {}
  }
}
