import Pager from '@/components/Pager'
import {
  CARD_CLASS,
  CELL_CLASS,
  DESCRIPTION_CLASS,
  DETAIL_CLASS,
  EMPTY_CLASS,
  EMPTY_TEXT,
  HEAD_CELL_CLASS,
  HEAD_CLASS,
  ROW_EVEN_CLASS,
  TABLE_CLASS,
  TITLE_CLASS,
  WRAP_CLASS,
} from './constants'
import type { DataTableUIProps } from './types'

const DataTableUI = ({ title, description, detail, columns, rows, keys, page, size, total, onPage }: DataTableUIProps) => {
  return (
    <section className={CARD_CLASS}>
      <div className={HEAD_CLASS}>
        <h3 className={TITLE_CLASS}>{title}</h3>
        <span className={DETAIL_CLASS}>{detail}</span>
      </div>
      <p className={DESCRIPTION_CLASS}>{description}</p>
      {total === 0 ? (
        <p className={EMPTY_CLASS}>{EMPTY_TEXT}</p>
      ) : (
        <div className={WRAP_CLASS}>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} className={HEAD_CELL_CLASS}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, index) => (
                <tr key={keys[index]} className={ROW_EVEN_CLASS}>
                  {cells.map((cell, column) => (
                    <td key={columns[column]} className={CELL_CLASS}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} size={size} total={total} onPage={onPage} />
    </section>
  )
}

export default DataTableUI
