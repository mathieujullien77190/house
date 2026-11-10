// Les climatisations Mitsubishi : la liste (AC_UNITS dans le .env) et leur état, lu au module Wi-Fi de chaque unité, et les changements (allumer, mode, consigne, ventilateur, ailettes).
// L'état est gardé 3 s : plusieurs onglets ouverts n'interrogent pas le module à chaque fois. Après un ordre, le module met un instant à refléter le nouvel état : on rend donc
// l'état d'avant avec le changement appliqué (sans relire), et la lecture suivante le confirme.
import type { AcPatch, AcReading, MitsubishiClient } from '../lib/mitsubishiClient.ts'

/** Une unité de la maison : son identifiant (dans l'URL), son nom affiché et l'adresse de son module Wi-Fi. */
export interface AcUnitConfig {
  id: string
  name: string
  host: string
}

export interface AcUnitInfo extends AcReading {
  id: string
  name: string
  /** Le module a répondu ; faux : tous les autres champs sont vides. */
  reachable: boolean
}

/** Une unité inconnue : la route répond 404. */
export class UnknownAcUnit extends Error {}

const CACHE_MS = 3000

interface Options {
  units: AcUnitConfig[]
  client: MitsubishiClient
  /** Les millisecondes depuis 1970 (injectée pour les essais). */
  now?: () => number
}

const EMPTY: AcReading = { power: false, mode: null, targetTemp: null, roomTemp: null, fan: null, vane: null, wideVane: null, rssi: null }

export const createAcService = ({ units, client, now = Date.now }: Options) => {
  const cache = new Map<string, { at: number; info: AcUnitInfo }>()

  const find = (id: string): AcUnitConfig => {
    const unit = units.find((candidate) => candidate.id === id)
    if (!unit) throw new UnknownAcUnit(id)
    return unit
  }

  const read = async (unit: AcUnitConfig): Promise<AcUnitInfo> => {
    const cached = cache.get(unit.id)
    if (cached && now() - cached.at < CACHE_MS) return cached.info
    let info: AcUnitInfo
    try {
      info = { id: unit.id, name: unit.name, reachable: true, ...(await client.read(unit.host)) }
    } catch {
      info = { id: unit.id, name: unit.name, reachable: false, ...EMPTY }
    }
    cache.set(unit.id, { at: now(), info })
    return info
  }

  return {
    /** Les unités et leur état (une qui ne répond pas est rendue avec `reachable: false`). */
    state: async (): Promise<AcUnitInfo[]> => Promise.all(units.map((unit) => read(unit))),
    /** Change l'alimentation, le mode, la consigne ou le ventilateur d'une unité (les champs absents ne bougent pas) et rend l'état d'avant avec le changement appliqué. Lève UnknownAcUnit, ou l'erreur du module. */
    update: async (id: string, patch: AcPatch): Promise<AcUnitInfo> => {
      const unit = find(id)
      await client.apply(unit.host, patch)
      const before = await read(unit)
      const info: AcUnitInfo = {
        ...before,
        reachable: true,
        power: patch.power ?? before.power,
        mode: patch.mode ?? before.mode,
        targetTemp: patch.temperature ?? before.targetTemp,
        fan: patch.fan ?? before.fan,
        vane: patch.vane ?? before.vane,
        wideVane: patch.wideVane ?? before.wideVane,
      }
      cache.set(unit.id, { at: now(), info })
      return info
    },
  }
}

export type AcService = ReturnType<typeof createAcService>
