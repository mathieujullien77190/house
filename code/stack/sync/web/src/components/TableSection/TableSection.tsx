import { useEffect, useState } from 'react'
import { DataTable } from '@house/ui'
import { fetchTable } from '@/lib/api'
import type { Page, Row } from '@/types'
import { renderCell } from './UI'
import { DESCRIPTIONS, OPEN_BY_DEFAULT, PAGE_SIZE } from './constants'
import type { TableSectionProps } from './types'

/**
 * Une table de la base, paginée, repliée par défaut sauf events : elle ne charge sa page qu'une fois dépliée,
 * et la recharge quand la page de House Sync se rafraîchit.
 */
const TableSection = ({ table, refreshTick, onOpen }: TableSectionProps) => {
  const [page, setPage] = useState(0)
  const [collapsed, setCollapsed] = useState(() => !OPEN_BY_DEFAULT.includes(table.name))
  const [data, setData] = useState<Page<Row> | null>(null)

  useEffect(() => {
    if (collapsed) return
    let cancelled = false
    fetchTable(table.name, page, PAGE_SIZE)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [table.name, page, refreshTick, collapsed])

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
      collapsed={collapsed}
      onToggle={() => setCollapsed((value) => !value)}
    />
  )
}

export default TableSection
