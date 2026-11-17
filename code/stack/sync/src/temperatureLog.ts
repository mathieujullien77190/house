// Le journal des températures : chaque heure, House Sync range une ligne (une colonne par source) dans la table `temperature_log` (onglet Base) et la page en tire un graphique.
// Sources : la météo chez soi (Open-Meteo, `temperature_2m`), la température de la pièce que mesure chaque pompe à chaleur (`roomTemp` de `GET /ac` chez House API)
// et la température de chaque détecteur Hue (`GET /hue/sensors`). Une source qui ne répond pas est sautée ; la valeur d'une heure et d'une source n'est écrite qu'une fois.
// Le relevé se tente chaque minute tant que l'heure en cours n'a aucune ligne (l'API peut être en train de démarrer).
import type { DatabaseSync } from 'node:sqlite'
import { messageOf, type Context } from './context.ts'
import { fetchApi, type ApiTarget } from './power.ts'

export const TEMPERATURE_TABLE = 'temperature_log'
export const WEATHER_NAME = 'Météo'
const HOUR_SECONDS = 3600

/** Le nom d'une source en nom de colonne : sans accents, minuscules, lettres, chiffres et « _ » (« Clim Chambre matou » devient `clim_chambre_matou`). */
export const columnOf = (name: string): string => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

/**
 * Une ligne par heure, une colonne par source (ajoutée au premier relevé de la source). L'ancienne forme (une ligne par heure et par source, colonne `name`)
 * est gardée telle quelle sous le nom `temperature_log_long` et ses valeurs sont reprises dans la nouvelle.
 */
export const createTemperatureTable = (db: DatabaseSync): void => {
  const columns = (db.prepare(`PRAGMA table_info(${TEMPERATURE_TABLE})`).all() as { name: string }[]).map((column) => column.name)
  const old = columns.includes('name') ? (db.prepare(`SELECT taken_at, name, celsius FROM ${TEMPERATURE_TABLE}`).all() as unknown as { taken_at: number; name: string; celsius: number }[]) : []
  if (columns.includes('name')) db.exec(`ALTER TABLE ${TEMPERATURE_TABLE} RENAME TO ${TEMPERATURE_TABLE}_long`)
  db.exec(`CREATE TABLE IF NOT EXISTS ${TEMPERATURE_TABLE} (taken_at INTEGER PRIMARY KEY);`)
  for (const row of old) {
    const column = columnOf(row.name)
    ensureColumn(db, column)
    db.prepare(`INSERT INTO ${TEMPERATURE_TABLE} (taken_at) VALUES (?) ON CONFLICT DO NOTHING`).run(row.taken_at)
    db.prepare(`UPDATE ${TEMPERATURE_TABLE} SET ${column} = ? WHERE taken_at = ?`).run(row.celsius, row.taken_at)
  }
}

/** Ajoute la colonne d'une source qui n'existe pas encore (le nom vient de `columnOf` : jamais autre chose que des lettres, chiffres et « _ »). */
const ensureColumn = (db: DatabaseSync, column: string): void => {
  const known = (db.prepare(`PRAGMA table_info(${TEMPERATURE_TABLE})`).all() as { name: string }[]).some((info) => info.name === column)
  if (!known) db.exec(`ALTER TABLE ${TEMPERATURE_TABLE} ADD COLUMN ${column} REAL`)
}

export interface TemperatureReading {
  name: string
  celsius: number
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Les pièces des pompes à chaleur (`GET /ac`) : « Clim <nom> », celles qui répondent et donnent une température. */
export const parseAcTemperatures = (data: unknown): TemperatureReading[] | null => {
  const units = (data as { units?: unknown } | null)?.units
  if (!Array.isArray(units)) return null
  return units.flatMap((unit: { name?: unknown; reachable?: unknown; roomTemp?: unknown }) =>
    unit?.reachable === true && typeof unit.name === 'string' && finite(unit.roomTemp) ? [{ name: `Clim ${unit.name}`, celsius: unit.roomTemp }] : [],
  )
}

/** Les détecteurs Hue (`GET /hue/sensors`) : « Hue <nom> », ceux qui donnent une température. */
export const parseSensorTemperatures = (data: unknown): TemperatureReading[] | null => {
  if (!Array.isArray(data)) return null
  return data.flatMap((sensor: { name?: unknown; temperature?: unknown }) =>
    typeof sensor?.name === 'string' && finite(sensor.temperature) ? [{ name: `Hue ${sensor.name}`, celsius: sensor.temperature }] : [],
  )
}

export const weatherTemperatureUrl = (latitude: number, longitude: number): string =>
  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`

export interface TemperaturePoint {
  at: number
  name: string
  celsius: number
}

/** Les points des `days` derniers jours, du plus ancien au plus récent (pour le graphique) : une ligne de la table donne un point par colonne renseignée. */
export const readTemperatures = (db: DatabaseSync, nowSeconds: number, days: number): TemperaturePoint[] => {
  const rows = db.prepare(`SELECT * FROM ${TEMPERATURE_TABLE} WHERE taken_at >= ? ORDER BY taken_at`).all(nowSeconds - days * 24 * HOUR_SECONDS) as Record<string, number | null>[]
  return rows.flatMap((row) => Object.entries(row).flatMap(([name, celsius]) => (name !== 'taken_at' && typeof celsius === 'number' ? [{ at: row.taken_at as number, name, celsius }] : [])))
}

export const createTemperatureLog = (ctx: Context, targetOf: () => ApiTarget | null) => {
  const { db, config } = ctx

  const weather = async (): Promise<TemperatureReading[]> => {
    const res = await ctx.fetch(weatherTemperatureUrl(config.housePosition.latitude, config.housePosition.longitude), { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const celsius = ((await res.json()) as { current?: { temperature_2m?: unknown } }).current?.temperature_2m
    if (!finite(celsius)) throw new Error('réponse inattendue')
    return [{ name: WEATHER_NAME, celsius }]
  }

  /** Range un relevé dans la ligne de l'heure (créée au besoin), colonne de la source ; 1 s'il est écrit, 0 si la source avait déjà sa valeur. */
  const store = (hour: number, reading: TemperatureReading): number => {
    const column = columnOf(reading.name)
    ensureColumn(db, column)
    db.prepare(`INSERT INTO ${TEMPERATURE_TABLE} (taken_at) VALUES (?) ON CONFLICT DO NOTHING`).run(hour)
    return Number(db.prepare(`UPDATE ${TEMPERATURE_TABLE} SET ${column} = ? WHERE taken_at = ? AND ${column} IS NULL`).run(reading.celsius, hour).changes)
  }

  /** Un relevé de l'heure en cours si elle n'a encore aucune ligne ; rend le nombre de lignes écrites. */
  const sample = async (): Promise<number> => {
    const hour = Math.floor(ctx.now() / 1000 / HOUR_SECONDS) * HOUR_SECONDS
    if (db.prepare(`SELECT 1 FROM ${TEMPERATURE_TABLE} WHERE taken_at = ? LIMIT 1`).get(hour)) return 0
    const target = targetOf()
    const sources: [string, () => Promise<TemperatureReading[]>][] = [['météo', weather]]
    if (target) {
      sources.push(['pompes à chaleur', () => fetchApi(target, '/ac', parseAcTemperatures)], ['détecteurs Hue', () => fetchApi(target, '/hue/sensors', parseSensorTemperatures)])
    }
    let written = 0
    for (const [label, read] of sources) {
      try {
        for (const reading of await read()) written += store(hour, reading)
      } catch (error) {
        ctx.log(`Températures : ${label} sautée (${messageOf(error)})`)
      }
    }
    return written
  }
  return { sample }
}
