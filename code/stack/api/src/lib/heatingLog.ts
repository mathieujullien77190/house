// Le journal des activations du chauffage (la prise de la volière) : une ligne JSON par activation dans STATE_DIR/heating-log.jsonl.
// L'API l'écrit ; House Sync l'importe dans la table `heating_log` de SQLite (l'API n'écrit jamais la base). Le fichier garde les N dernières lignes.
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** D'où vient l'activation : la règle automatique, ou une commande de l'API (WebApp) avec une durée. Un geste sur la prise elle-même (bouton, appli Kasa) n'est pas noté. */
export type HeatingOrigin = 'auto' | 'manuel'

export interface HeatingEntry {
  /** Secondes depuis 1970. */
  at: number
  origin: HeatingOrigin
  /** La durée programmée, en minutes. */
  minutes: number
  /** La température (°C) qu'il faisait, quand on la connaît. */
  temperature: number | null
  note: string | null
  /** Le coût prévu en euros (durée programmée × puissance × tarif du moment), écrit à l'activation : un changement de tarif ne touche pas le passé. Null si la puissance du chauffage est inconnue. */
  cost: number | null
}

/** Une activation avant le calcul de son coût. */
export type Activation = Omit<HeatingEntry, 'cost'>

/** Combien de lignes le fichier garde. */
export const MAX_LINES = 5000
const ORIGINS: readonly string[] = ['auto', 'manuel']

const numberOrNull = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/** Une ligne du fichier en activation ; null si elle est abîmée. */
export const parseEntry = (line: string): HeatingEntry | null => {
  let raw: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(line)
    if (typeof parsed !== 'object' || parsed === null) return null
    raw = parsed as Record<string, unknown>
  } catch {
    return null
  }
  const at = numberOrNull(raw.at)
  const minutes = numberOrNull(raw.minutes)
  if (at === null || minutes === null || typeof raw.origin !== 'string' || !ORIGINS.includes(raw.origin)) return null
  return {
    at,
    origin: raw.origin as HeatingOrigin,
    minutes,
    temperature: numberOrNull(raw.temperature),
    note: typeof raw.note === 'string' ? raw.note.slice(0, 200) : null,
    cost: numberOrNull(raw.cost),
  }
}

export const createHeatingLog = (file: string, limit = MAX_LINES) => {
  /** Toutes les activations du fichier, dans l'ordre d'écriture (les lignes abîmées et un fichier absent sont ignorés). */
  const readAll = (): HeatingEntry[] => {
    let text: string
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      return []
    }
    return text
      .split('\n')
      .map(parseEntry)
      .filter((entry): entry is HeatingEntry => entry !== null)
  }
  return {
    /** Ajoute une activation. Une écriture qui échoue ne gêne jamais la commande de la prise. */
    append: (entry: HeatingEntry): void => {
      try {
        mkdirSync(dirname(file), { recursive: true })
        appendFileSync(file, `${JSON.stringify(entry)}\n`)
        const all = readAll()
        if (all.length > limit) {
          const partial = `${file}.tmp`
          writeFileSync(partial, all.slice(-limit).map((kept) => `${JSON.stringify(kept)}\n`).join(''))
          renameSync(partial, file)
        }
      } catch {
        // le journal est perdu pour cette fois, la prise marche quand même
      }
    },
    /** Les `limit` dernières activations, la plus récente d'abord. */
    recent: (count: number): HeatingEntry[] => readAll().slice(-count).reverse(),
    /** Le début de la dernière activation (secondes), null s'il n'y en a jamais eu. */
    lastAt: (): number | null => {
      const all = readAll()
      return all.length === 0 ? null : Math.max(...all.map((entry) => entry.at))
    },
  }
}

export type HeatingLog = ReturnType<typeof createHeatingLog>
