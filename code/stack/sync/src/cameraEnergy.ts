// L'énergie consommée par les caméras (estimation) : chaque minute, House Sync lit la puissance PoE de chaque caméra chez House API
// (`GET /poe`, comme la page Machine) et compte « dernière puissance connue × temps écoulé », rangée par caméra et par heure dans la table
// `camera_energy` (onglet Base), avec le coût au tarif heures creuses / pleines (constantes).
// Rien n'est inventé : si l'API ne répond pas, le tour est sauté ; un trou de plus de 5 minutes n'est pas rattrapé.
import type { DatabaseSync } from 'node:sqlite'
import { messageOf, type Context } from './context.ts'
import { fetchCameraPower, type ApiTarget, type CameraPower } from './power.ts'

export const CAMERA_ENERGY_TABLE = 'camera_energy'
/** Le début du suivi (ISO), dans app_settings : posé au premier relevé. */
export const SINCE_KEY = 'camera_energy_since'
/** Un relevé vaut au plus 5 minutes : après une panne, on ne compte pas de consommation que personne n'a mesurée. */
export const MAX_GAP_MS = 300_000
const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000

/** €/kWh en heures creuses et en heures pleines : des constantes, les mêmes que `api/src/lib/heatingSettings.ts` (tarif TotalEnergies du 8 novembre 2026) ; si l'un change, changer l'autre. */
export const OFF_PEAK_PRICE_KWH = 0.1589
export const PEAK_PRICE_KWH = 0.2142

/** Les heures creuses (heure de Paris, la plage passe minuit) : des constantes, les mêmes que `api/src/lib/heatingSettings.ts` (Enedis, été comme hiver) ; si l'un change, changer l'autre. */
export const OFF_PEAK_START = '23:10'
export const OFF_PEAK_END = '07:10'

export const createCameraEnergyTable = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${CAMERA_ENERGY_TABLE} (
      camera TEXT NOT NULL,
      hour TEXT NOT NULL,
      wh_offpeak REAL NOT NULL DEFAULT 0,
      wh_peak REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (camera, hour)
    );
  `)
}

const parisClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const toMinutes = (clock: string): number => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5))

/** L'instant (millisecondes) est-il en heures creuses ? La plage passe minuit (23:10 → 07:10). */
export const isOffPeak = (ms: number): boolean => {
  const minute = toMinutes(parisClock.format(new Date(ms)))
  const from = toMinutes(OFF_PEAK_START)
  const to = toMinutes(OFF_PEAK_END)
  return minute >= from || minute < to
}

export interface Slice {
  /** Début de l'heure (ISO, UTC : Paris est décalé d'heures entières, c'est aussi son heure pleine). */
  hour: string
  ms: number
  offPeak: boolean
}

/** [from, to[ découpé à chaque minute entière : une tranche ne passe jamais d'une heure, ni du creux au plein. */
export const slicesOf = (from: number, to: number): Slice[] => {
  const slices: Slice[] = []
  for (let start = from; start < to; ) {
    const end = Math.min(to, (Math.floor(start / MINUTE_MS) + 1) * MINUTE_MS)
    slices.push({ hour: new Date(Math.floor(start / HOUR_MS) * HOUR_MS).toISOString(), ms: end - start, offPeak: isOffPeak(start) })
    start = end
  }
  return slices
}

export interface CameraEnergyTotals {
  /** Le début du suivi (ISO) ; null tant qu'aucun relevé n'a réussi. */
  since: string | null
  cameras: { camera: string; kwh: number; cost: number }[]
  total: { kwh: number; cost: number }
}

/** Les totaux depuis le début, par caméra et en tout. */
export const readCameraEnergy = (db: DatabaseSync): CameraEnergyTotals => {
  const since = (db.prepare('SELECT value FROM app_settings WHERE key = ?').get(SINCE_KEY) as { value: string } | undefined)?.value ?? null
  const rows = db
    .prepare(`SELECT camera, SUM(wh_offpeak + wh_peak) AS wh, SUM(cost) AS cost FROM ${CAMERA_ENERGY_TABLE} GROUP BY camera ORDER BY camera`)
    .all() as { camera: string; wh: number; cost: number }[]
  const cameras = rows.map((row) => ({ camera: row.camera, kwh: row.wh / 1000, cost: row.cost }))
  return { since, cameras, total: { kwh: cameras.reduce((sum, c) => sum + c.kwh, 0), cost: cameras.reduce((sum, c) => sum + c.cost, 0) } }
}

export type PowerFetcher = (target: ApiTarget) => Promise<CameraPower[]>

/** Le relevé de chaque minute : `targetOf` rend la cible de l'API (null : non configurée, on ne fait rien). */
export const createCameraEnergy = (ctx: Context, targetOf: () => ApiTarget | null, fetchPower: PowerFetcher = fetchCameraPower) => {
  const { db } = ctx
  const upsert = db.prepare(
    `INSERT INTO ${CAMERA_ENERGY_TABLE} (camera, hour, wh_offpeak, wh_peak, cost) VALUES (:camera, :hour, :off, :peak, :cost)
     ON CONFLICT (camera, hour) DO UPDATE SET wh_offpeak = wh_offpeak + :off, wh_peak = wh_peak + :peak, cost = cost + :cost`,
  )
  let previous: { at: number; watts: Map<string, number> } | null = null

  const record = (watts: Map<string, number>, from: number, to: number): void => {
    const slices = slicesOf(from, to)
    db.exec('BEGIN')
    try {
      for (const [camera, power] of watts) {
        for (const slice of slices) {
          const wh = (power * slice.ms) / HOUR_MS
          const off = slice.offPeak ? wh : 0
          const peak = slice.offPeak ? 0 : wh
          upsert.run({ camera, hour: slice.hour, off, peak, cost: ((off * OFF_PEAK_PRICE_KWH) + (peak * PEAK_PRICE_KWH)) / 1000 })
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
    let cameras: CameraPower[]
    try {
      cameras = await fetchPower(target)
    } catch (error) {
      ctx.log(`Énergie des caméras : relevé sauté (${messageOf(error)})`)
      return false
    }
    const at = ctx.now()
    try {
      if (previous) record(previous.watts, previous.at, Math.min(at, previous.at + MAX_GAP_MS))
      else db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run(SINCE_KEY, new Date(at).toISOString())
    } catch (error) {
      ctx.log(`Énergie des caméras : ${messageOf(error)}`)
    }
    previous = { at, watts: new Map(cameras.map((camera) => [camera.camera, camera.watts])) }
    return true
  }
  return { sample }
}
