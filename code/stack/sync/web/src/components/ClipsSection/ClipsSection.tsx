import { useEffect, useState } from 'react'
import { Button, DataTable, StackedDate, Tabs, TableFilters } from '@house/ui'
import { fetchClips } from '@/lib/api'
import { NO_FILTER } from '@/lib/filter'
import { formatSize, splitMs } from '@/lib/format'
import type { BackupFile, ClipGroup, Filter, FilteredPage } from '@/types'
import {
  CAMERA_ALL,
  CAMERA_LABEL,
  CLEAR_LABEL,
  COLUMNS,
  DATE_LABEL,
  DESCRIPTION,
  MISSING_TEXT,
  MUTED_CLASS,
  OPEN_LABEL,
  OTHERS_LABEL,
  PAGE_SIZE,
  SAVED_LABEL,
  TITLE,
  VERSION_CLASS,
  VIEWS_FIELD_CLASS,
  VIEWS_LABEL,
  VIEWS_TITLE,
  VIEWS_TITLE_CLASS,
} from './constants'
import { clipName } from './helpers'
import type { ClipsSectionProps } from './types'

/** Les clips du disque backup, paginés : une ligne par événement, un bouton « voir » par version dans le panneau. */
const ClipsSection = ({ refreshTick, onOpen }: ClipsSectionProps) => {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<FilteredPage<ClipGroup> | null>(null)
  // Deux vues d'une seule table : les clips sauvegardés depuis la WebApp, et les autres.
  const [view, setView] = useState<'saved' | 'others'>('saved')
  const [filter, setFilter] = useState<Filter>(NO_FILTER)

  useEffect(() => {
    let cancelled = false
    fetchClips(page, PAGE_SIZE, view === 'saved', filter)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [page, refreshTick, view, filter])

  const clips = data?.items ?? []
  const change = (patch: Partial<Filter>) => {
    setFilter((current) => ({ ...current, ...patch }))
    setPage(0)
  }
  const filters = (
    <TableFilters
      match={{
        label: CAMERA_LABEL,
        allLabel: CAMERA_ALL,
        value: filter.match,
        options: data?.options ?? [],
        onChange: (match) => change({ match }),
      }}
      date={{ label: DATE_LABEL, value: filter.day, onChange: (day) => change({ day }) }}
      clear={{ label: CLEAR_LABEL, onClear: () => change(NO_FILTER) }}
    >
      <div className={VIEWS_FIELD_CLASS}>
        <span className={VIEWS_TITLE_CLASS}>{VIEWS_TITLE}</span>
        <Tabs
          label={VIEWS_LABEL}
          options={[
            { id: 'saved', label: SAVED_LABEL },
            { id: 'others', label: OTHERS_LABEL },
          ]}
          value={view}
          onChange={(next) => {
            setView(next)
            setPage(0)
          }}
        />
      </div>
    </TableFilters>
  )
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
        <StackedDate key="date" {...splitMs(clip.modifiedMs)} />,
      ])}
      keys={clips.map((clip) => clip.id)}
      filters={filters}
      page={page}
      size={PAGE_SIZE}
      total={data?.total ?? 0}
      onPage={setPage}
    />
  )
}

export default ClipsSection
