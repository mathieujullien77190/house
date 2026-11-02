// La base de House Sync, ouverte en lecture seule au premier besoin : elle n'existe qu'après son premier tour.
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
}

export const openDatabase = (path: string): Database => {
  let db: DatabaseSync | null = null
  const connection = (): DatabaseSync => {
    if (db) return db
    try {
      db = new DatabaseSync(path, { readOnly: true })
      return db
    } catch {
      throw new DatabaseNotReady()
    }
  }
  return {
    all: <T>(sql: string, ...params: (string | number)[]) => connection().prepare(sql).all(...params) as T[],
    get: <T>(sql: string, ...params: (string | number)[]) => connection().prepare(sql).get(...params) as T | undefined,
  }
}
