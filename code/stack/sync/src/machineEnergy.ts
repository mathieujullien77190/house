// L'énergie consommée par le mini PC (estimation) : chaque minute, House Sync lit la puissance du processeur (le fichier que `power/house-power.sh` écrit sur l'hôte,
// le même que celui de `/api/power`) et compte « dernière puissance connue × temps écoulé », rangée par heure dans la table `machine_energy` (onglet Base),
// avec le coût au tarif heures creuses / pleines (constantes de `cameraEnergy.ts`).
// Attention : c'est la puissance du PROCESSEUR seul (RAPL), sans la carte mère, le SSD ni les ventilateurs : un minimum, pas la prise.
// Rien n'est inventé : si la mesure manque ou est trop vieille, le tour est sauté ; un trou de plus de 5 minutes n'est pas rattrapé.
import type { DatabaseSync } from 'node:sqlite'
import { HOUR_MS, MAX_GAP_MS, OFF_PEAK_PRICE_KWH, PEAK_PRICE_KWH, slicesOf } from './cameraEnergy.ts'
import { messageOf, type Context } from './context.ts'
import { readCpuPower, type CpuPower } from './power.ts'

export const MACHINE_ENERGY_TABLE = 'machine_energy'
/** Le début du suivi (ISO), dans app_settings : posé au premier relevé. */
export const MACHINE_SINCE_KEY = 'machine_energy_since'
/** L'unique appareil suivi. */
export const MACHINE_DEVICE = 'mini-pc'

export const createMachineEnergyTable = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MACHINE_ENERGY_TABLE} (
      device TEXT NOT NULL,
      hour TEXT NOT NULL,
      wh_offpeak REAL NOT NULL DEFAULT 0,
      wh_peak REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (device, hour)
    );
  `)
}

export interface MachineEnergyTotals {
  /** Le début du suivi (ISO) ; null tant qu'aucun relevé n'a réussi. */
  since: string | null
  kwh: number
  cost: number
}

/** Les totaux depuis le début. */
export const readMachineEnergy = (db: DatabaseSync): MachineEnergyTotals => {
  const since = (db.prepare('SELECT value FROM app_settings WHERE key = ?').get(MACHINE_SINCE_KEY) as { value: string } | undefined)?.value ?? null
  const row = db.prepare(`SELECT SUM(wh_offpeak + wh_peak) AS wh, SUM(cost) AS cost FROM ${MACHINE_ENERGY_TABLE}`).get() as { wh: number | null; cost: number | null }
  return { since, kwh: (row.wh ?? 0) / 1000, cost: row.cost ?? 0 }
}

export type CpuReader = () => Promise<CpuPower | null>

/** Le relevé de chaque minute : `readCpu` rend la puissance du processeur (null : mesure absente ou trop vieille). */
export const createMachineEnergy = (ctx: Context, readCpu: CpuReader = () => readCpuPower(ctx.config.powerFile)) => {
  const { db } = ctx
  const upsert = db.prepare(
    `INSERT INTO ${MACHINE_ENERGY_TABLE} (device, hour, wh_offpeak, wh_peak, cost) VALUES (:device, :hour, :off, :peak, :cost)
     ON CONFLICT (device, hour) DO UPDATE SET wh_offpeak = wh_offpeak + :off, wh_peak = wh_peak + :peak, cost = cost + :cost`,
  )
  let previous: { at: number; watts: number } | null = null

  const record = (watts: number, from: number, to: number): void => {
    const slices = slicesOf(from, to)
    db.exec('BEGIN')
    try {
      for (const slice of slices) {
        const wh = (watts * slice.ms) / HOUR_MS
        const off = slice.offPeak ? wh : 0
        const peak = slice.offPeak ? 0 : wh
        upsert.run({ device: MACHINE_DEVICE, hour: slice.hour, off, peak, cost: ((off * OFF_PEAK_PRICE_KWH) + (peak * PEAK_PRICE_KWH)) / 1000 })
      }
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  /** Un relevé ; rend vrai s'il a été fait. */
  const sample = async (): Promise<boolean> => {
    let cpu: CpuPower | null
    try {
      cpu = await readCpu()
    } catch (error) {
      ctx.log(`Énergie du mini PC : relevé sauté (${messageOf(error)})`)
      return false
    }
    if (!cpu) return false
    const at = ctx.now()
    try {
      if (previous) record(previous.watts, previous.at, Math.min(at, previous.at + MAX_GAP_MS))
      else db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run(MACHINE_SINCE_KEY, new Date(at).toISOString())
    } catch (error) {
      ctx.log(`Énergie du mini PC : ${messageOf(error)}`)
    }
    previous = { at, watts: cpu.watts }
    return true
  }
  /** La dernière puissance connue (W) du processeur ; null tant qu'aucun relevé n'a réussi. */
  const current = (): number | null => previous?.watts ?? null
  return { sample, current }
}
