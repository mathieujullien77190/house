import type { PieSlice } from '@house/ui'
import type { Overview } from '@/types'
import { formatSize } from './format'

/** Un camembert prêt à afficher : ses parts et le texte du centre. */
export interface ChartModel {
  slices: PieSlice[]
  centerValue: string
  centerLabel: string
}

/** Le camembert du disque : ce que House Sync y a mis, le reste du disque (système, enregistrements), et le libre ; null si la taille est inconnue. */
export const buildDiskChart = (overview: Overview): ChartModel | null => {
  const { total, free } = overview.backup.disk
  if (total <= 0) return null
  const clips = overview.backup.clips.size
  const snapshots = overview.backup.snapshots.size
  const database = overview.database.size
  const used = Math.max(0, total - free)
  const other = Math.max(0, used - clips - snapshots - database)
  const slice = (id: string, label: string, value: number, tone: PieSlice['tone']): PieSlice => ({ id, label, value, display: formatSize(value), tone })
  return {
    slices: [
      slice('clips', 'Clips vidéo', clips, 'accent'),
      slice('snapshots', 'Images par minute', snapshots, 'green'),
      slice('db', 'Base SQLite', database, 'orange'),
      slice('other', 'Autres fichiers (système, enregistrements)', other, 'muted'),
      slice('free', 'Libre', free, 'line'),
    ],
    centerValue: formatSize(free),
    centerLabel: `libres sur ${formatSize(total)}`,
  }
}
