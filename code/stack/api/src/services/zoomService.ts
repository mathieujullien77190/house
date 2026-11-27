// Le zoom optique des caméras qui en ont un (CAMERA_ZOOMS : les RLC-811A « pommier » et « portail ») : lire la position et sa plage, la régler.
// La plage ne change jamais (c'est celle de l'objectif) : une fois lue, elle est gardée et sert à borner la position demandée sans relire la caméra.
// Avec `pause` (zoomPauseService.ts), chaque réglage et chaque lecture tiennent à jour la pause des analyses de l'enregistreur, et les réponses disent si elle est en cours (`paused`).
import type { ReolinkCamera, ReolinkClient, ZoomState } from '../lib/reolinkClient.ts'
import type { ZoomPause } from './zoomPauseService.ts'

/** Une caméra à zoom optique : son nom (celui de la WebApp), son adresse et son compte. */
export interface ZoomCameraConfig extends ReolinkCamera {
  camera: string
}

/** Une caméra sans zoom optique configuré : la route répond 404. */
export class UnknownZoomCamera extends Error {}

interface Options {
  cameras: ZoomCameraConfig[]
  client: ReolinkClient
  /** La pause des analyses de l'enregistreur pendant le zoom ; absente (pas d'enregistreur) : `paused` vaut toujours false. */
  pause?: Pick<ZoomPause, 'paused' | 'onSet' | 'observe'> | null
}

/** Ce que rendent les routes : la position, sa plage, et si les analyses de l'enregistreur sont en pause pour cette caméra. */
export interface ZoomReply extends ZoomState {
  paused: boolean
}

export const createZoomService = ({ cameras, client, pause = null }: Options) => {
  const ranges = new Map<string, { min: number; max: number }>()

  const find = (name: string): ZoomCameraConfig => {
    const found = cameras.find((candidate) => candidate.camera === name)
    if (!found) throw new UnknownZoomCamera(name)
    return found
  }

  const read = async (config: ZoomCameraConfig): Promise<ZoomState> => {
    const state = await client.getZoom(config)
    ranges.set(config.camera, { min: state.min, max: state.max })
    return state
  }

  return {
    /** La position du zoom et sa plage. Lève UnknownZoomCamera, ou l'erreur de la caméra. */
    get: async (name: string): Promise<ZoomReply> => {
      const state = await read(find(name))
      pause?.observe(name, state)
      return { ...state, paused: pause?.paused(name) ?? false }
    },
    /** Règle la position (ramenée dans la plage) et rend celle demandée à la caméra : l'objectif met quelques secondes à y arriver. */
    set: async (name: string, pos: number): Promise<ZoomReply> => {
      const config = find(name)
      const range = ranges.get(name) ?? (await read(config))
      const target = Math.min(range.max, Math.max(range.min, pos))
      await client.setZoom(config, target)
      // L'objectif a bougé : la pause des analyses suit, sans jamais faire échouer le réglage (l'envoi à l'enregistreur n'est pas attendu).
      pause?.onSet(name, target, range.min)
      return { pos: target, min: range.min, max: range.max, paused: pause?.paused(name) ?? false }
    },
  }
}

export type ZoomService = ReturnType<typeof createZoomService>
