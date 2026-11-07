import type { ReactNode } from 'react'
import { Button, StackedDate } from '@house/ui'
import { splitSeconds } from '@/lib/format'
import type { Cell, Media } from '@/types'
import { BADGE_CLASS, CAMERA_CLASS, IP_CLASS, LINK_CLASS, MEDIA_CLASS, MUTED_CLASS, NULL_TEXT, OPEN_LABEL } from './constants'
import { isTimestamp, mediaOf } from './helpers'

/** Une cellule : les médias deviennent un bouton, les adresses des liens, les horodatages une date (sans le nombre de secondes), les étiquettes des pastilles. */
export const renderCell = (column: string, value: Cell, onOpen: (media: Media) => void): ReactNode => {
  if (value === null || value === undefined) return <i className={MUTED_CLASS}>{NULL_TEXT}</i>
  const media = mediaOf(column, value)
  if (media) {
    return (
      <span className={MEDIA_CLASS}>
        <span>{media.path}</span>
        <Button onClick={() => onOpen(media)}>{OPEN_LABEL}</Button>
      </span>
    )
  }
  if (isTimestamp(column, value)) {
    return <StackedDate {...splitSeconds(value)} />
  }
  if (column === 'url' && typeof value === 'string') {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        {value}
      </a>
    )
  }
  if (column === 'label') return <span className={BADGE_CLASS}>{value}</span>
  if (column === 'camera') return <span className={CAMERA_CLASS}>{value}</span>
  if (column === 'ip') return <span className={IP_CLASS}>{value}</span>
  return String(value)
}
