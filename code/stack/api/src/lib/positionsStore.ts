// Les positions des ampoules sur le plan de la maison : un petit fichier JSON gardé par l'API (STATE_DIR), pour qu'elles
// suivent l'utilisateur d'un appareil à l'autre. Un seul fichier, écrit en entier à chaque changement (quelques dizaines de lampes).
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** La position d'une ampoule par identifiant de lampe, en unités du plan (la maison fait 540 × 300, origine en haut à gauche). */
export type LampPositions = Record<string, { x: number; y: number }>

const ID = /^\d+$/
/** Les positions restent dans le voisinage du plan : une valeur plus grande est une erreur, pas une position. */
const LIMIT = 5000
const MAX_ENTRIES = 200

/** Des positions valides (identifiants de lampe, x et y finis, arrondis) ; null si le corps n'a pas cette forme. */
export const parsePositions = (body: unknown): LampPositions | null => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const entries = Object.entries(body as Record<string, unknown>)
  if (entries.length === 0 || entries.length > MAX_ENTRIES) return null
  const positions: LampPositions = {}
  for (const [id, value] of entries) {
    if (!ID.test(id) || typeof value !== 'object' || value === null) return null
    const { x, y } = value as { x?: unknown; y?: unknown }
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > LIMIT || Math.abs(y) > LIMIT) return null
    positions[id] = { x: Math.round(x), y: Math.round(y) }
  }
  return positions
}

export const createPositionsStore = (file: string) => {
  const read = (): LampPositions => {
    try {
      return parsePositions(JSON.parse(readFileSync(file, 'utf8'))) ?? {}
    } catch {
      return {}
    }
  }
  return {
    get: read,
    /** Ajoute ou remplace ces positions, garde les autres ; rend l'ensemble. Écrit dans un fichier temporaire puis le renomme. */
    merge: (changes: LampPositions): LampPositions => {
      const next = { ...read(), ...changes }
      mkdirSync(dirname(file), { recursive: true })
      const partial = `${file}.tmp`
      writeFileSync(partial, JSON.stringify(next, null, 2))
      renameSync(partial, file)
      return next
    },
  }
}

export type PositionsStore = ReturnType<typeof createPositionsStore>
