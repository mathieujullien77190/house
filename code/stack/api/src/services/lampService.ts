// Quand une lampe était allumée : des plages (from, to) en secondes, d'après le journal des lampes de House Sync.
import type { LampRepository } from '../repositories/lampRepository.ts'

export interface LampPeriod {
  from: number
  to: number
  /** Vrai quand la lampe est encore allumée à l'instant présent : la plage continue. */
  open?: boolean
}

export const createLampService = (lamps: LampRepository, now: () => number = () => Math.floor(Date.now() / 1000)) => ({
  /**
   * Les plages où la lampe était allumée dans [from, to] : l'état au début de la fenêtre vient du dernier changement connu
   * avant (le journal n'en a peut-être pas : alors éteinte), puis chaque allumage ouvre une plage et chaque extinction la ferme.
   * Une plage encore ouverte s'arrête à `to`, sans dépasser l'instant présent.
   */
  periods: (name: string, from: number, to: number): LampPeriod[] => {
    const end = Math.min(to, now())
    if (end <= from) return []
    const periods: LampPeriod[] = []
    let since: number | null = lamps.stateBefore(name, from) === true ? from : null
    for (const change of lamps.switches(name, from, end)) {
      if (change.on && since === null) since = change.at
      else if (!change.on && since !== null) {
        periods.push({ from: since, to: change.at })
        since = null
      }
    }
    if (since !== null) periods.push({ from: since, to: end, open: to >= now() })
    return periods
  },
})

export type LampService = ReturnType<typeof createLampService>
