import { useEffect, useState } from 'react'
import { Button, DataTable } from '@house/ui'
import { fetchClips } from '@/lib/api'
import { formatDateMs, formatSize } from '@/lib/format'
import type { BackupFile, Page } from '@/types'
import { COLUMNS, DESCRIPTION, MUTED_CLASS, NUM_CLASS, OPEN_LABEL, PAGE_SIZE, TITLE } from './constants'
import type { ClipsSectionProps } from './types'

/** Les clips du disque backup, paginés, avec un bouton pour voir chacun dans le panneau. */
const ClipsSection = ({ refreshTick, onOpen }: ClipsSectionProps) => {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<BackupFile> | null>(null)

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

  const files = data?.items ?? []
  return (
    <DataTable
      title={TITLE}
      description={DESCRIPTION}
      detail={`${data?.total ?? 0} fichier(s)`}
      columns={COLUMNS}
      rows={files.map((file) => [
        <span key="path" className="inline-flex flex-wrap items-center gap-2">
          <span>{file.path}</span>
          <Button onClick={() => onOpen({ path: file.path, kind: 'video' })}>{OPEN_LABEL}</Button>
        </span>,
        <span key="size" className={NUM_CLASS}>
          {formatSize(file.size)}
        </span>,
        <span key="date" className={MUTED_CLASS}>
          {formatDateMs(file.modifiedMs)}
        </span>,
      ])}
      keys={files.map((file) => file.path)}
      page={page}
      size={PAGE_SIZE}
      total={data?.total ?? 0}
      onPage={setPage}
    />
  )
}

export default ClipsSection
