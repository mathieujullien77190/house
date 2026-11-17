// La base de House Sync, ouverte au premier besoin : elle n'existe qu'après son premier tour. Lecture, et écriture des seules actions de l'utilisateur (`run`).
import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

export class DatabaseNotReady extends Error {
  constructor() {
    super('database not ready')
  }
}

export interface Database {
  /** Toutes les lignes d'une requête. */
  all: <T>(sql: string, ...params: (string | number)[]) => T[]
  /** La première ligne, ou undefined. */
  get: <T>(sql: string, ...params: (string | number)[]) => T | undefined
  /** Une écriture (INSERT, UPDATE, DELETE) : réservée aux actions de l'utilisateur ; rend le nombre de lignes touchées. */
  run: (sql: string, ...params: (string | number | null)[]) => number
  /** Ferme la connexion si elle est ouverte (elle se rouvre au besoin) : les tests en ont besoin pour supprimer le fichier sous Windows. */
  close: () => void
}

export const openDatabase = (path: string): Database => {
  let db: DatabaseSync | null = null
  const connection = (): DatabaseSync => {
    if (db) return db
    try {
      // Une base absente ne doit pas être créée vide ici : House Sync la crée.
      if (!existsSync(path)) throw new DatabaseNotReady()
      db = new DatabaseSync(path)
      db.exec('PRAGMA busy_timeout = 5000')
      return db
    } catch {
      throw new DatabaseNotReady()
    }
  }
  return {
    all: <T>(sql: string, ...params: (string | number)[]) =>
      connection()
        .prepare(sql)
        .all(...params) as T[],
    get: <T>(sql: string, ...params: (string | number)[]) =>
      connection()
        .prepare(sql)
        .get(...params) as T | undefined,
    run: (sql: string, ...params: (string | number | null)[]) => Number(connection().prepare(sql).run(...params).changes),
    close: () => {
      db?.close()
      db = null
    },
  }
}
