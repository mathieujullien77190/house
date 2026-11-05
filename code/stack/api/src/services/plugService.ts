// La prise connectée : son état (allumée ou non, signal WiFi) et son changement. Un état lu est gardé 2 s.
import type { KasaClient, PlugInfo } from '../lib/kasaClient.ts'

export type PlugState = PlugInfo

const CACHE_MS = 2000

export const createPlugService = (client: KasaClient) => {
  let cached: { at: number; state: PlugState } | null = null
  const read = async (): Promise<PlugState> => {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.state
    const state = await client.info()
    cached = { at: Date.now(), state }
    return state
  }
  return {
    get: read,
    /** Allume ou éteint la prise, puis rend son état à jour. */
    set: async (on: boolean): Promise<PlugState> => {
      await client.set(on)
      cached = null
      return read()
    },
  }
}

export type PlugService = ReturnType<typeof createPlugService>
