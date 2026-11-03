import { useEffect, useState } from 'react'
import { Button, DataTable } from '@house/ui'
import { fetchClips } from '@/lib/api'
import { formatDateMs, formatSize } from '@/lib/format'
import type { BackupFile, ClipGroup, Page } from '@/types'
import { COLUMNS, DESCRIPTION, MISSING_TEXT, MUTED_CLASS, OPEN_LABEL, PAGE_SIZE, TITLE, VERSION_CLASS } from './constants'
import { clipName } from './helpers'
import type { ClipsSectionProps } from './types'

/** Les clips du disque backup, paginés : une ligne par événement, un bouton « voir » par version dans le panneau. */
const ClipsSection = ({ refreshTick, onOpen }: ClipsSectionProps) => {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<ClipGroup> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchClips(page, PAGE_SIZE)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [page, refreshTick])

  const clips = data?.items ?? []
  const version = (file: BackupFile | null) =>
    file ? (
      <span className={VERSION_CLASS}>
        <Button onClick={() => onOpen({ path: file.path, kind: 'video' })}>{OPEN_LABEL}</Button>
        <span className={MUTED_CLASS}>{formatSize(file.size)}</span>
      </span>
    ) : (
      <span className={MUTED_CLASS}>{MISSING_TEXT}</span>
    )
  return (
    <DataTable
      title={TITLE}
      description={DESCRIPTION}
      detail={`${data?.total ?? 0} clip(s)`}
      columns={COLUMNS}
      rows={clips.map((clip) => [
        <span key="name">{clipName(clip.id)}</span>,
        <span key="light">{version(clip.light)}</span>,
        <span key="original">{version(clip.original)}</span>,
        <span key="date" className={MUTED_CLASS}>
          {formatDateMs(clip.modifiedMs)}
        </span>,
      ])}
      keys={clips.map((clip) => clip.id)}
      page={page}
      size={PAGE_SIZE}
      total={data?.total ?? 0}
      onPage={setPage}
    />
  )
}

export default ClipsSection
