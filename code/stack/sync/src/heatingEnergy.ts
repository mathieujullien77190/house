// La consommation du chauffage (la prise de la volière) pour l'arbre de la consommation électrique : rien n'est mesuré, tout vient du journal `heating_log`
// (une ligne par activation : minutes allumées, coût calculé par House API au tarif du moment). Énergie = minutes × puissance du radiateur ; coût = somme des coûts.
import type { DatabaseSync } from 'node:sqlite'

/** La puissance du radiateur (W) : **copie assumée** de `HEATER_WATTS` dans `api/src/lib/heatingSettings.ts`, à tenir d'accord. */
export const HEATER_WATTS = 2000

export interface HeatingEnergyTotals {
  /** Le début du journal (ISO) ; null tant qu'il est vide. */
  since: string | null
  kwh: number
  cost: number
  /** La puissance actuelle (W) : celle du radiateur pendant une activation en cours, 0 sinon. */
  watts: number
}

/** Les totaux depuis la première activation ; `nowSeconds` (secondes depuis 1970) sert à savoir si une activation est en cours. */
export const readHeatingEnergy = (db: DatabaseSync, nowSeconds: number = Math.floor(Date.now() / 1000)): HeatingEnergyTotals => {
  const sums = db.prepare('SELECT MIN(started_at) AS first, SUM(minutes) AS minutes, SUM(cost) AS cost FROM heating_log').get() as { first: number | null; minutes: number | null; cost: number | null }
  const running = db.prepare('SELECT 1 AS yes FROM heating_log WHERE started_at <= ? AND started_at + minutes * 60 > ? LIMIT 1').get(nowSeconds, nowSeconds)
  return {
    since: sums.first === null ? null : new Date(sums.first * 1000).toISOString(),
    kwh: ((sums.minutes ?? 0) / 60) * (HEATER_WATTS / 1000),
    cost: sums.cost ?? 0,
    watts: running ? HEATER_WATTS : 0,
  }
}
