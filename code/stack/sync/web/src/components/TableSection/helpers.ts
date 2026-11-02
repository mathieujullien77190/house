import type { Media } from '@/types'

/** Le média qu'une cellule désigne, s'il y en a un (chemin de clip ou d'image sur le disque backup). */
export const mediaOf = (column: string, value: unknown): Media | null => {
  if (typeof value !== 'string') return null
  if (column === 'clip_path' && value.endsWith('.mp4')) return { path: value, kind: 'video' }
  if (column === 'path' && value.endsWith('.jpg')) return { path: value, kind: 'image' }
  return null
}

/** Les colonnes dont la valeur est un horodatage, en secondes. */
export const isTimestamp = (column: string, value: unknown): value is number => typeof value === 'number' && column.endsWith('_at')
