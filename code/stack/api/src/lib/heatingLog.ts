// Le journal des activations du chauffage (la prise de la volière), table `heating_log` de la base. L'API envoie chaque activation à House Sync (`lib/journalClient.ts`), seul à écrire
// dans la base, et relit la table pour le rythme de la règle automatique et la page. Une base pas encore prête ou une écriture qui échoue ne gêne jamais la commande de la prise.
import type { Database } from '../db/database.ts'
import type { JournalPost } from './journalClient.ts'

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

export const createHeatingLog = (post: JournalPost, db: Database) => {
  // L'envoi à House Sync est asynchrone : la dernière activation envoyée compte tout de suite pour la règle (cooldown), avant d'être dans la table.
  let sentAt: number | null = null
  const lastStored = (): number | null => {
    try {
      return db.get<{ at: number | null }>('SELECT MAX(started_at) AS at FROM heating_log')?.at ?? null
    } catch {
      return null
    }
  }
  return {
    /** Envoie une activation à House Sync. */
    append: (entry: HeatingEntry): void => {
      sentAt = Math.max(sentAt ?? entry.at, entry.at)
      post('heating', entry)
    },
    /** Les `count` dernières activations, la plus récente d'abord. */
    recent: (count: number): HeatingEntry[] => {
      try {
        return db.all<HeatingEntry>('SELECT started_at AS at, origin, minutes, temperature, note, cost FROM heating_log ORDER BY started_at DESC LIMIT ?', count)
      } catch {
        return []
      }
    },
    /** Le début de la dernière activation (secondes), null s'il n'y en a jamais eu. */
    lastAt: (): number | null => {
      const stored = lastStored()
      return stored === null ? sentAt : sentAt === null ? stored : Math.max(stored, sentAt)
    },
  }
}

export type HeatingLog = ReturnType<typeof createHeatingLog>
