// Allumer ou éteindre une caméra : on coupe ou on rend le PoE du port du switch où elle est branchée.
import type { PortStatus, SwitchClient } from '../lib/switchClient.ts'

export interface CameraPower {
  camera: string
  port: number
  /** Le PoE du port est activé. */
  on: boolean
  /** Le switch alimente bien la caméra (elle peut mettre un moment à démarrer ou à s'éteindre). */
  powered: boolean
  watts: number
  /** go2rtc reçoit bien le flux de la caméra : elle a fini de démarrer (compter une minute après le courant). */
  streaming: boolean
}

export class UnknownCamera extends Error {}

const CACHE_MS = 3000

const toPower = (camera: string, status: PortStatus, streaming: boolean): CameraPower => ({
  camera,
  port: status.port,
  on: status.enabled,
  powered: status.powered,
  watts: status.watts,
  streaming,
})

interface Go2rtcStreams {
  [name: string]: { producers?: { bytes_recv?: number }[] }
}

/**
 * Le flux principal de la caméra arrive-t-il à go2rtc ? go2rtc garde le producteur d'une caméra éteinte : on compte
 * donc les octets reçus et le flux est vivant quand ce total a grandi depuis la lecture précédente (le total ne
 * bouge plus quand la caméra est coupée ou démarre). À la première lecture, on suppose que oui. Faux si go2rtc ne répond pas.
 */
const createStreamWatch = (go2rtcUrl: string) => {
  const lastBytes = new Map<string, number>()
  return async (camera: string): Promise<boolean> => {
    try {
      const res = await fetch(`${go2rtcUrl}/api/streams`, { signal: AbortSignal.timeout(2000) })
      if (!res.ok) return false
      const streams = (await res.json()) as Go2rtcStreams
      const bytes = (streams[`${camera}_main`]?.producers ?? []).reduce((sum, producer) => sum + (producer.bytes_recv ?? 0), 0)
      const previous = lastBytes.get(camera)
      lastBytes.set(camera, bytes)
      return previous === undefined ? bytes > 0 : bytes > previous
    } catch {
      return false
    }
  }
}

export const createPoeService = (client: SwitchClient, ports: Record<string, number>, go2rtcUrl: string) => {
  let cache: { at: number; value: CameraPower[] } | null = null
  const isStreaming = createStreamWatch(go2rtcUrl)

  return {
    /** L'état de chaque caméra branchée à un port connu, mis en cache quelques secondes (le switch est lent). */
    list: async (): Promise<CameraPower[]> => {
      if (cache && Date.now() - cache.at < CACHE_MS) return cache.value
      const statuses = await client.ports()
      const value = await Promise.all(
        Object.entries(ports).map(async ([camera, port]) => toPower(camera, statuses[port - 1], await isStreaming(camera))),
      )
      cache = { at: Date.now(), value }
      return value
    },
    set: async (camera: string, on: boolean): Promise<CameraPower> => {
      const port = ports[camera]
      if (port === undefined) throw new UnknownCamera(camera)
      const status = await client.setPoe(port, on)
      cache = null
      return toPower(camera, status, await isStreaming(camera))
    },
  }
}

export type PoeService = ReturnType<typeof createPoeService>
