// Un document JSON de l'utilisateur (positions des lampes, notes des clips, zones, plan, réglages…) rangé dans la table `house_state` de la base : une ligne par clé (texte JSON, date).
// C'est l'action de l'utilisateur dans la WebApp qui l'écrit, jamais une observation. Chaque magasin (`*Store.ts`) lit et écrit son texte par `read` et `write`, comme il le faisait avec un fichier :
// `read` lève une erreur de code `ENOENT` quand le document n'existe pas encore, et toute autre erreur quand la base n'est pas prête.
import type { Database } from '../db/database.ts'

export interface DocStore {
  /** Le texte JSON du document ; lève `ENOENT` s'il n'existe pas. */
  read: () => string
  /** Remplace le document. */
  write: (text: string) => void
}

export const createDocStore = (db: Database, key: string, now: () => number = Date.now): DocStore => ({
  read: () => {
    const row = db.get<{ value: string }>('SELECT value FROM house_state WHERE key = ?', key)
    if (!row) throw Object.assign(new Error(`document ${key} absent`), { code: 'ENOENT' })
    return row.value
  },
  write: (text) => {
    db.run('INSERT INTO house_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', key, text, Math.floor(now() / 1000))
  },
})
