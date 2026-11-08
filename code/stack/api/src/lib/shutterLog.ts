// Le journal des ordres aux volets roulants : une ligne JSON par ordre dans STATE_DIR/shutters-log.jsonl.
// L'API l'écrit ; House Sync l'importe dans la table `shutter_log` de SQLite (l'API n'écrit jamais la base). Le fichier garde les N dernières lignes.
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { SHUTTER_COMMANDS, type ShutterCommand } from './shutterDriver.ts'

export interface ShutterEntry {
  /** Secondes depuis 1970. */
  at: number
  /** L'identifiant du volet (voir SHUTTERS) et son nom, gardé tel qu'il était à l'ordre. */
  shutter: string
  name: string
  command: ShutterCommand
  /** L'ordre est parti sans erreur (le Somfy RTS ne dit pas si le volet a bougé). Faux : l'ESP32 n'a pas répondu. */
  ok: boolean
  /** La simulation (aucun ordre radio) ou la raison d'un échec ; sinon null. */
  note: string | null
}

/** Combien de lignes le fichier garde. */
export const MAX_LINES = 5000

/** Une ligne du fichier en ordre ; null si elle est abîmée. */
export const parseEntry = (line: string): ShutterEntry | null => {
  let raw: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(line)
    if (typeof parsed !== 'object' || parsed === null) return null
    raw = parsed as Record<string, unknown>
  } catch {
    return null
  }
  if (typeof raw.at !== 'number' || !Number.isFinite(raw.at)) return null
  if (typeof raw.shutter !== 'string' || typeof raw.name !== 'string' || typeof raw.ok !== 'boolean') return null
  if (typeof raw.command !== 'string' || !SHUTTER_COMMANDS.includes(raw.command as ShutterCommand)) return null
  return {
    at: raw.at,
    shutter: raw.shutter,
    name: raw.name,
    command: raw.command as ShutterCommand,
    ok: raw.ok,
    note: typeof raw.note === 'string' ? raw.note.slice(0, 200) : null,
  }
}

export const createShutterLog = (file: string, limit = MAX_LINES) => {
  const readAll = (): ShutterEntry[] => {
    let text: string
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      return []
    }
    return text
      .split('\n')
      .map(parseEntry)
      .filter((entry): entry is ShutterEntry => entry !== null)
  }
  return {
    /** Ajoute un ordre. Une écriture qui échoue ne gêne jamais la commande du volet. */
    append: (entry: ShutterEntry): void => {
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
        // le journal est perdu pour cette fois, le volet a reçu son ordre quand même
      }
    },
    /** Les `count` derniers ordres, le plus récent d'abord. */
    recent: (count: number): ShutterEntry[] => readAll().slice(-count).reverse(),
  }
}

export type ShutterLog = ReturnType<typeof createShutterLog>
