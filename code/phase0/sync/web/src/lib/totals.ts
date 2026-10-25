import type { Total } from '@house/ui'
import type { Overview } from '@/types'
import { formatSize } from './format'

/** Les trois chiffres en tête de page : les vidéos, les images par minute, la base. */
export const buildTotals = (overview: Overview): Total[] => {
  const events = overview.database.tables.find((t) => t.name === 'events')?.count ?? 0
  return [
    { id: 'clips', value: formatSize(overview.backup.clips.size), label: `${overview.backup.clips.count} vidéo(s) sur le disque backup` },
    { id: 'snapshots', value: formatSize(overview.backup.snapshots.size), label: `${overview.backup.snapshots.count} image(s) par minute` },
    { id: 'db', value: formatSize(overview.database.size), label: `base SQLite · ${events} événement(s)` },
  ]
}
