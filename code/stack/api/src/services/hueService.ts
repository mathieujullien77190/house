// Les lumières : les pièces du pont Hue et leurs lampes, et leur allumage (une pièce entière ou une lampe).
import type { HueClient, HueState } from '../lib/hueClient.ts'
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
