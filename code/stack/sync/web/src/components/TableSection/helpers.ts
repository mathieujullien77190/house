import type { Media } from '@/types'

/** Le média qu'une cellule désigne, s'il y en a un (chemin de clip ou d'image sur le disque backup). */
export const mediaOf = (column: string, value: unknown): Media | null => {
  if (typeof value !== 'string') return null
  if ((column === 'clip_path' || column === 'clip_web_path') && value.endsWith('.mp4')) return { path: value, kind: 'video' }
  if (column === 'path' && value.endsWith('.jpg')) return { path: value, kind: 'image' }
  return null
}

/** Les colonnes dont la valeur est un horodatage, en secondes. */
export const isTimestamp = (column: string, value: unknown): value is number => typeof value === 'number' && column.endsWith('_at')

/** Les sommes d'une table à totaux (heating_log) en une phrase : « activé 35 min · 0,53 € » ; vide pour les autres tables. */
export const sumsText = (sums: Record<string, number> | undefined): string => {
  if (!sums || sums.minutes === undefined || sums.cost === undefined) return ''
  const hours = Math.floor(sums.minutes / 60)
  const duration = hours > 0 ? `${hours} h ${String(sums.minutes % 60).padStart(2, '0')}` : `${sums.minutes} min`
  const euros = sums.cost.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return ` · activé ${duration} · ${euros} €`
}
