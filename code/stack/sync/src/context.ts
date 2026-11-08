// Ce que partagent les modules de House Sync : la base, la configuration, les réglages, et les trois choses que les essais remplacent
// (le réseau, l'horloge, le journal).
import type { DatabaseSync } from 'node:sqlite'
import type { Config } from './config.ts'
import type { Settings } from './settings.ts'

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>

export interface Context {
  db: DatabaseSync
  config: Config
  settings: Settings
  fetch: Fetch
  /** L'heure, en millisecondes depuis 1970. */
  now: () => number
  log: (message: string) => void
}

/** Les secondes entières depuis 1970. */
export const seconds = (ctx: Pick<Context, 'now'>): number => Math.floor(ctx.now() / 1000)

/** Le texte d'une erreur, pour le journal. */
export const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))
