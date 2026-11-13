// Le journal des connexions des invités de la Freebox : une ligne JSON par connexion ou déconnexion dans STATE_DIR/box-connections.jsonl.
// L'API l'écrit ; House Sync l'importe dans la table `box_connections` de SQLite (l'API n'écrit jamais la base). Le fichier garde les N dernières lignes.
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface BoxConnectionEntry {
  /** Secondes depuis 1970. */
  at: number
  event: 'connect' | 'disconnect'
  mac: string
  name: string
  ip: string | null
  type: string | null
  vendor: string | null
}

/** Combien de lignes le fichier garde. */
export const MAX_LINES = 5000

const text = (value: unknown): string | null => (typeof value === 'string' ? value.slice(0, 200) : null)

/** Une ligne du fichier en entrée ; null si elle est abîmée. */
export const parseEntry = (line: string): BoxConnectionEntry | null => {
  let raw: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(line)
    if (typeof parsed !== 'object' || parsed === null) return null
    raw = parsed as Record<string, unknown>
  } catch {
    return null
  }
  if (typeof raw.at !== 'number' || !Number.isFinite(raw.at)) return null
  if (raw.event !== 'connect' && raw.event !== 'disconnect') return null
  if (typeof raw.mac !== 'string' || typeof raw.name !== 'string') return null
  return { at: raw.at, event: raw.event, mac: raw.mac, name: raw.name.slice(0, 200), ip: text(raw.ip), type: text(raw.type), vendor: text(raw.vendor) }
}

export const createBoxConnectionLog = (file: string, limit = MAX_LINES) => {
  const readAll = (): BoxConnectionEntry[] => {
    let content: string
    try {
      content = readFileSync(file, 'utf8')
    } catch {
      return []
    }
    return content
      .split('\n')
      .map(parseEntry)
      .filter((entry): entry is BoxConnectionEntry => entry !== null)
  }
  return {
    /** Ajoute des lignes. Une écriture qui échoue est perdue sans gêner le surveillant. */
    append: (entries: BoxConnectionEntry[]): void => {
      try {
        mkdirSync(dirname(file), { recursive: true })
        appendFileSync(file, entries.map((entry) => `${JSON.stringify(entry)}\n`).join(''))
        const all = readAll()
        if (all.length > limit) {
          const partial = `${file}.tmp`
          writeFileSync(partial, all.slice(-limit).map((kept) => `${JSON.stringify(kept)}\n`).join(''))
          renameSync(partial, file)
        }
      } catch {
        // le journal est perdu pour cette fois
      }
    },
    /** Les `count` dernières lignes, la plus récente d'abord. */
    recent: (count: number): BoxConnectionEntry[] => readAll().slice(-count).reverse(),
  }
}

export type BoxConnectionLog = ReturnType<typeof createBoxConnectionLog>
