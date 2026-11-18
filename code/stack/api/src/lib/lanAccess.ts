// Ce que la page invité du réseau permet : le document `lan-access` de la table `house_state` (`lib/docStore.ts`), écrit par House Sync quand l'utilisateur
// bouge un interrupteur de sa page, relu par l'API à chaque demande (jamais gardé). Tout est coupé par défaut : sans document, ou document faux, la page est désactivée.
import type { DocStore } from './docStore.ts'

export interface LanAccess {
  /** L'interrupteur général : coupé, toutes les routes `/lan` répondent 403. */
  enabled: boolean
  cameras: boolean
  shutters: boolean
  lights: boolean
  ac: boolean
}

export type LanCapability = Exclude<keyof LanAccess, 'enabled'>

export const DISABLED: LanAccess = { enabled: false, cameras: false, shutters: false, lights: false, ac: false }

export const readLanAccess = (doc: DocStore): LanAccess => {
  try {
    const raw: unknown = JSON.parse(doc.read())
    if (typeof raw !== 'object' || raw === null) return DISABLED
    const record = raw as Record<string, unknown>
    return {
      enabled: record.enabled === true,
      cameras: record.cameras === true,
      shutters: record.shutters === true,
      lights: record.lights === true,
      ac: record.ac === true,
    }
  } catch {
    return DISABLED
  }
}
