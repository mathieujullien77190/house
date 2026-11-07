import { Fragment, useEffect, useState } from 'react'
import { DataTable } from '@house/ui'
import { fetchTable } from '@/lib/api'
import type { Page, Row } from '@/types'
import { renderCell } from './UI'
import { DESCRIPTIONS, DETAIL_LABEL_CLASS, DETAIL_VALUE_CLASS, DETAILS_CLASS, MAIN_COLUMNS, PAGE_SIZE } from './constants'
import type { TableSectionProps } from './types'

/**
 * Une table de la base, paginée, repliée par défaut (toutes les tables) : elle ne charge sa page qu'une fois dépliée,
 * et la recharge quand la page de House Sync se rafraîchit.
 */
const TableSection = ({ table, refreshTick, onOpen }: TableSectionProps) => {
  const [page, setPage] = useState(0)
  const [collapsed, setCollapsed] = useState(true)
  const [data, setData] = useState<Page<Row> | null>(null)
  // La ligne dépliée (tables à colonnes principales seulement).
  const [openKey, setOpenKey] = useState<string | null>(null)

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
  // Une table à colonnes principales montre celles-là (dans l'ordre de MAIN_COLUMNS) dans la ligne et le reste dans le détail, au clic.
  const main = MAIN_COLUMNS[table.name]
  const columns = main ? main.filter((column) => table.columns.includes(column)) : table.columns
  const secondary = main ? table.columns.filter((column) => !main.includes(column)) : []
  const keyOf = (row: Row, index: number) => String(row.id ?? `${row.camera ?? ''}-${row.taken_at ?? index}`)
  return (
    <DataTable
      title={table.name}
      description={DESCRIPTIONS[table.name] ?? ''}
      detail={`${table.count} ligne(s)`}
      columns={columns}
      rows={rows.map((row) => columns.map((column) => renderCell(column, row[column] ?? null, onOpen)))}
      keys={rows.map(keyOf)}
      details={
        main
          ? rows.map((row) => (
              <dl className={DETAILS_CLASS}>
                {secondary.map((column) => (
                  <Fragment key={column}>
                    <dt className={DETAIL_LABEL_CLASS}>{column}</dt>
                    <dd className={DETAIL_VALUE_CLASS}>{renderCell(column, row[column] ?? null, onOpen)}</dd>
                  </Fragment>
                ))}
              </dl>
            ))
          : undefined
      }
      openKey={openKey}
      onRowClick={(key) => setOpenKey((current) => (current === key ? null : key))}
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
