// L'énergie consommée par les lampes Hue (estimation) : chaque minute, House Sync lit chez House API (`GET /hue`) la puissance estimée de chaque lampe
// (`watts`, calculé d'après le modèle, l'état et la luminosité : `api/src/lib/hueWatts.ts`) et compte « dernière puissance connue × temps écoulé »,
// rangée par lampe (son nom) et par heure dans la table `lamp_energy` (onglet Base), avec le coût au tarif heures creuses / pleines (constantes de `cameraEnergy.ts`).
// Rien n'est inventé : si l'API ne répond pas, le tour est sauté ; un trou de plus de 5 minutes n'est pas rattrapé.
import type { DatabaseSync } from 'node:sqlite'
import { HOUR_MS, MAX_GAP_MS, OFF_PEAK_PRICE_KWH, PEAK_PRICE_KWH, slicesOf } from './cameraEnergy.ts'
import { messageOf, type Context } from './context.ts'
import { fetchLampPower, type ApiTarget, type LampPower } from './power.ts'

export const LAMP_ENERGY_TABLE = 'lamp_energy'
/** Le début du suivi (ISO), dans app_settings : posé au premier relevé. */
export const LAMP_SINCE_KEY = 'lamp_energy_since'

export const createLampEnergyTable = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${LAMP_ENERGY_TABLE} (
      lamp TEXT NOT NULL,
      hour TEXT NOT NULL,
      wh_offpeak REAL NOT NULL DEFAULT 0,
      wh_peak REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (lamp, hour)
    );
  `)
}

export interface LampEnergyTotals {
  /** Le début du suivi (ISO) ; null tant qu'aucun relevé n'a réussi. */
  since: string | null
  /** Les lampes de la plus gourmande à la moins gourmande. */
  lamps: { lamp: string; kwh: number; cost: number }[]
  total: { kwh: number; cost: number }
}

/** Les totaux depuis le début, par lampe et en tout. */
export const readLampEnergy = (db: DatabaseSync): LampEnergyTotals => {
  const since = (db.prepare('SELECT value FROM app_settings WHERE key = ?').get(LAMP_SINCE_KEY) as { value: string } | undefined)?.value ?? null
  const rows = db
    .prepare(`SELECT lamp, SUM(wh_offpeak + wh_peak) AS wh, SUM(cost) AS cost FROM ${LAMP_ENERGY_TABLE} GROUP BY lamp ORDER BY wh DESC, lamp`)
    .all() as { lamp: string; wh: number; cost: number }[]
  const lamps = rows.map((row) => ({ lamp: row.lamp, kwh: row.wh / 1000, cost: row.cost }))
  return { since, lamps, total: { kwh: lamps.reduce((sum, l) => sum + l.kwh, 0), cost: lamps.reduce((sum, l) => sum + l.cost, 0) } }
}

export type LampFetcher = (target: ApiTarget) => Promise<LampPower[]>

/** Le relevé de chaque minute : `targetOf` rend la cible de l'API (null : non configurée, on ne fait rien). */
export const createLampEnergy = (ctx: Context, targetOf: () => ApiTarget | null, fetchLamps: LampFetcher = fetchLampPower) => {
  const { db } = ctx
  const upsert = db.prepare(
    `INSERT INTO ${LAMP_ENERGY_TABLE} (lamp, hour, wh_offpeak, wh_peak, cost) VALUES (:lamp, :hour, :off, :peak, :cost)
     ON CONFLICT (lamp, hour) DO UPDATE SET wh_offpeak = wh_offpeak + :off, wh_peak = wh_peak + :peak, cost = cost + :cost`,
  )
  let previous: { at: number; watts: Map<string, number> } | null = null

  const record = (watts: Map<string, number>, from: number, to: number): void => {
    const slices = slicesOf(from, to)
    db.exec('BEGIN')
    try {
      for (const [lamp, power] of watts) {
        for (const slice of slices) {
          const wh = (power * slice.ms) / HOUR_MS
          const off = slice.offPeak ? wh : 0
          const peak = slice.offPeak ? 0 : wh
          upsert.run({ lamp, hour: slice.hour, off, peak, cost: ((off * OFF_PEAK_PRICE_KWH) + (peak * PEAK_PRICE_KWH)) / 1000 })
        }
      }
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  /** Un relevé ; rend vrai s'il a été fait. */
  const sample = async (): Promise<boolean> => {
    const target = targetOf()
    if (!target) return false
    let lamps: LampPower[]
    try {
      lamps = await fetchLamps(target)
    } catch (error) {
      ctx.log(`Énergie des lampes : relevé sauté (${messageOf(error)})`)
      return false
    }
    const at = ctx.now()
    try {
      if (previous) record(previous.watts, previous.at, Math.min(at, previous.at + MAX_GAP_MS))
      else db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run(LAMP_SINCE_KEY, new Date(at).toISOString())
    } catch (error) {
      ctx.log(`Énergie des lampes : ${messageOf(error)}`)
    }
    previous = { at, watts: new Map(lamps.map((lamp) => [lamp.lamp, lamp.watts])) }
    return true
  }
  /** La dernière puissance connue (W) de chaque lampe ; vide tant qu'aucun relevé n'a réussi. */
  const current = (): Map<string, number> => new Map(previous?.watts ?? [])
  return { sample, current }
}
