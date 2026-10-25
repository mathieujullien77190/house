import { useEffect, useState } from 'react'
import DataTable from '@/components/DataTable'
import { fetchTable } from '@/lib/api'
import type { Page, Row } from '@/types'
import { renderCell } from './UI'
import { DESCRIPTIONS, PAGE_SIZE } from './constants'
import type { TableSectionProps } from './types'

/** Une table de la base, paginée : charge sa page courante et la recharge quand la page de House Sync se rafraîchit. */
const TableSection = ({ table, refreshTick, onOpen }: TableSectionProps) => {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<Row> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTable(table.name, page, PAGE_SIZE)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [table.name, page, refreshTick])

  const rows = data?.items ?? []
  return (
    <DataTable
      title={table.name}
      description={DESCRIPTIONS[table.name] ?? ''}
      detail={`${table.count} ligne(s)`}
      columns={table.columns}
      rows={rows.map((row) => table.columns.map((column) => renderCell(column, row[column] ?? null, onOpen)))}
      keys={rows.map((row, index) => String(row.id ?? `${row.camera ?? ''}-${row.taken_at ?? index}`))}
      page={page}
      size={PAGE_SIZE}
      total={data?.total ?? table.count}
      onPage={setPage}
    />
  )
}

export default TableSection
