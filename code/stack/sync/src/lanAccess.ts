// Ce que la page invité du réseau permet (`/chezmatou` de la WebApp, servie par House API) : le document `lan-access` de la table `house_state`, que House Sync écrit quand l'utilisateur bouge
// un interrupteur de sa page (une action de l'utilisateur) et que House API relit à chaque demande. Forme : {"enabled", "cameras", "shutters", "lights", "ac"} ; tout est coupé par défaut.
import type { DatabaseSync } from 'node:sqlite'
import { HOUSE_STATE_TABLE, readState } from './houseState.ts'

export interface LanAccess {
  /** L'interrupteur général : coupé, la page et toutes ses routes sont refusées. */
  enabled: boolean
  cameras: boolean
  shutters: boolean
  lights: boolean
  ac: boolean
}

export const LAN_ACCESS_KEYS = ['enabled', 'cameras', 'shutters', 'lights', 'ac'] as const

export const DISABLED_LAN_ACCESS: LanAccess = { enabled: false, cameras: false, shutters: false, lights: false, ac: false }

/** Lit le document ; absent ou faux : tout coupé. */
export const readLanAccess = (db: DatabaseSync): LanAccess => {
  try {
    const text = readState(db, 'lan-access')
    const raw: unknown = text === null ? null : JSON.parse(text)
    if (typeof raw !== 'object' || raw === null) return DISABLED_LAN_ACCESS
    const record = raw as Record<string, unknown>
    return { enabled: record.enabled === true, cameras: record.cameras === true, shutters: record.shutters === true, lights: record.lights === true, ac: record.ac === true }
  } catch {
    return DISABLED_LAN_ACCESS
  }
}

/** Applique un changement : seulement des clés connues avec des booléens ; null si le corps est faux ou vide. Les clés absentes gardent leur valeur. */
export const mergeLanAccess = (current: LanAccess, body: Record<string, unknown>): LanAccess | null => {
  const keys = Object.keys(body)
  if (keys.length === 0 || keys.some((key) => !(LAN_ACCESS_KEYS as readonly string[]).includes(key) || typeof body[key] !== 'boolean')) return null
  return { ...current, ...(body as Partial<LanAccess>) }
}

export const writeLanAccess = (db: DatabaseSync, access: LanAccess, nowSeconds: number): void => {
  db.prepare(`INSERT INTO ${HOUSE_STATE_TABLE} (key, value, updated_at) VALUES ('lan-access', ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(JSON.stringify(access), nowSeconds)
}
