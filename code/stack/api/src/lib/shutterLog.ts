// Le journal des ordres aux volets roulants, table `shutter_log` de la base. L'API envoie chaque ordre à House Sync (`lib/journalClient.ts`), seul à écrire dans la base, et la relit
// au démarrage pour retrouver le dernier ordre de chaque volet. Une base pas encore prête ou une écriture qui échoue ne gêne jamais la commande du volet.
import type { Database } from '../db/database.ts'
import type { JournalPost } from './journalClient.ts'
import type { ShutterCommand } from './shutterDriver.ts'

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

interface ShutterRow {
  at: number
  shutter: string
  name: string
  command: ShutterCommand
  ok: number
  note: string | null
}

export const createShutterLog = (post: JournalPost, db: Database) => ({
  /** Envoie un ordre à House Sync. */
  append: (entry: ShutterEntry): void => post('shutters', entry),
  /** Les `count` derniers ordres, le plus récent d'abord. */
  recent: (count: number): ShutterEntry[] => {
    try {
      return db
        .all<ShutterRow>('SELECT happened_at AS at, shutter, name, command, ok, note FROM shutter_log ORDER BY happened_at DESC, id DESC LIMIT ?', count)
        .map((row) => ({ ...row, ok: row.ok === 1 }))
    } catch {
      return []
    }
  },
})

export type ShutterLog = ReturnType<typeof createShutterLog>
