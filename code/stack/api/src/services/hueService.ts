// Les lumières : les pièces du pont Hue et leurs lampes, et leur allumage (une pièce entière ou une lampe).
import { describeAutomations, type AutomationDto, type BehaviorInstance, type Named } from '../lib/automations.ts'
import type { HueClient, HueSensor, HueState } from '../lib/hueClient.ts'
import type { LampPositions, PositionsStore } from '../lib/positionsStore.ts'

export interface LightDto {
  id: string
  name: string
  on: boolean
  /** Luminosité de 1 à 254 ; null pour une lampe qui ne varie pas. */
  bri: number | null
  reachable: boolean
}

export interface RoomDto {
  id: string
  name: string
  /** Au moins une lampe de la pièce est allumée. */
  on: boolean
  /** La luminosité commune de la pièce telle que le pont la retient ; null si inconnue. */
  bri: number | null
  lights: LightDto[]
}

export class UnknownHueId extends Error {}

const ID = /^\d+$/
const MIN_BRI = 1
const MAX_BRI = 254

/** Un état valide : on (booléen) et/ou bri (entier de 1 à 254) ; null sinon. */
export const parseState = (body: unknown): HueState | null => {
  if (typeof body !== 'object' || body === null) return null
  const { on, bri } = body as { on?: unknown; bri?: unknown }
  const state: HueState = {}
  if (on !== undefined) {
    if (typeof on !== 'boolean') return null
    state.on = on
  }
  if (bri !== undefined) {
    if (typeof bri !== 'number' || !Number.isInteger(bri) || bri < MIN_BRI || bri > MAX_BRI) return null
    state.bri = bri
  }
  return state.on === undefined && state.bri === undefined ? null : state
}

/** Un détecteur de mouvement Hue avec sa température et sa luminosité. */
export interface SensorDto {
  /** L'identifiant du capteur de mouvement chez le pont. */
  id: string
  name: string
  /** Un mouvement est détecté en ce moment ; null si le pont ne le dit pas. */
  presence: boolean | null
  /** Le dernier changement de l'état de mouvement (ISO, UTC), ou null. */
  presenceSince: string | null
  /** En degrés Celsius, à un dixième près ; null si inconnue. */
  temperature: number | null
  /** La luminosité en lux ; null si inconnue. */
  lux: number | null
  dark: boolean | null
  battery: number | null
  reachable: boolean
}

/** L'adresse radio d'un capteur : le début de son uniqueid, commun aux trois capteurs d'un même détecteur. */
const deviceOf = (sensor: HueSensor): string => sensor.uniqueid?.split('-')[0] ?? ''

/** Un horodatage du pont (« 2026-11-03T01:55:59 », en UTC, sans fuseau) en ISO avec le Z. */
const utc = (value: string | undefined): string | null => (value && /^\d{4}-\d\d-\d\dT/.test(value) ? `${value}Z` : null)

/** Réunit mouvement, luminosité et température d'un même détecteur : un par capteur de mouvement. */
export const toSensors = (raw: Record<string, HueSensor>): SensorDto[] => {
  const all = Object.entries(raw)
  return all
    .filter(([, sensor]) => sensor.type === 'ZLLPresence')
    .map(([id, presence]) => {
      const device = deviceOf(presence)
      const sibling = (type: string): HueSensor | undefined => all.find(([, sensor]) => sensor.type === type && device !== '' && deviceOf(sensor) === device)?.[1]
      const light = sibling('ZLLLightLevel')
      const temperature = sibling('ZLLTemperature')
      const level = light?.state.lightlevel
      const celsius = temperature?.state.temperature
      return {
        id,
        name: presence.name,
        presence: presence.state.presence ?? null,
        presenceSince: utc(presence.state.lastupdated),
        temperature: typeof celsius === 'number' ? Math.round(celsius / 10) / 10 : null,
        // Le pont donne la luminosité en échelle logarithmique : 10 000 × log10(lux) + 1.
        lux: typeof level === 'number' ? Math.round(10 ** ((level - 1) / 10000)) : null,
        dark: light?.state.dark ?? null,
        battery: presence.config.battery ?? null,
        reachable: presence.config.reachable ?? false,
      }
    })
}

export const createHueService = (hue: HueClient, positions: PositionsStore) => {
  const list = async (): Promise<RoomDto[]> => {
    const [lights, groups] = await Promise.all([hue.lights(), hue.groups()])
    const toLight = (id: string): LightDto | null => {
      const light = lights[id]
      return light ? { id, name: light.name, on: light.state.on, bri: light.state.bri ?? null, reachable: light.state.reachable } : null
    }
    const rooms: RoomDto[] = []
    const placed = new Set<string>()
    for (const [id, group] of Object.entries(groups)) {
      if (group.type !== 'Room') continue
      group.lights.forEach((lightId) => placed.add(lightId))
      rooms.push({
        id,
        name: group.name,
        on: group.state.any_on,
        bri: group.action.bri ?? null,
        lights: group.lights.map(toLight).filter((light): light is LightDto => light !== null),
      })
    }
    // Les lampes qui ne sont dans aucune pièce.
    const alone = Object.keys(lights)
      .filter((id) => !placed.has(id))
      .map(toLight)
      .filter((light): light is LightDto => light !== null)
    if (alone.length > 0) rooms.push({ id: 'other', name: 'Autres', on: alone.some((light) => light.on), bri: null, lights: alone })
    return rooms
  }

  return {
    list,
    /** Les règles d'automatisation du pont (horaires et détecteurs), en phrases. */
    automations: async (): Promise<AutomationDto[]> => {
      const [instances, rooms, lights, scenes] = await Promise.all([
        hue.v2<BehaviorInstance>('behavior_instance'),
        hue.v2<Named>('room'),
        hue.v2<Named>('light'),
        hue.v2<Named>('scene'),
      ])
      return describeAutomations(instances, rooms, lights, scenes)
    },
    /** Les détecteurs de mouvement, avec leur température et leur luminosité. */
    sensors: async (): Promise<SensorDto[]> => toSensors(await hue.sensors()),
    /** Les positions des ampoules sur le plan que l'utilisateur a posées. */
    positions: (): LampPositions => positions.get(),
    /** Garde ces positions (les autres restent) ; rend l'ensemble. */
    setPositions: (changes: LampPositions): LampPositions => positions.merge(changes),
    /** Allume, éteint ou règle une pièce entière ; rend l'état à jour. */
    setRoom: async (id: string, state: HueState): Promise<RoomDto[]> => {
      if (!ID.test(id)) throw new UnknownHueId()
      await hue.setGroup(id, state)
      return list()
    },
    /** Allume, éteint ou règle une lampe ; rend l'état à jour. */
    setLight: async (id: string, state: HueState): Promise<RoomDto[]> => {
      if (!ID.test(id)) throw new UnknownHueId()
      await hue.setLight(id, state)
      return list()
    },
  }
}

export type HueService = ReturnType<typeof createHueService>
