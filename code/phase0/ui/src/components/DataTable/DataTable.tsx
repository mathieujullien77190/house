import Pager from '../Pager'
import {
  CARD_CLASS,
  CELL_CLASS,
  CHEVRON_CLASS,
  CHEVRON_OPEN_CLASS,
  COLLAPSE_ARIA,
  DESCRIPTION_CLASS,
  DETAIL_CLASS,
  EMPTY_CLASS,
  EMPTY_TEXT,
  EXPAND_ARIA,
  HEAD_CELL_CLASS,
  HEAD_CLASS,
  ROW_CLASS,
  TABLE_CLASS,
  TITLE_CLASS,
  TOGGLE_CLASS,
  WRAP_CLASS,
} from './constants'
import type { DataTableProps } from './types'

/** Un tableau paginé dans une carte, repliable si le parent le demande : les cellules arrivent déjà rendues. */
const DataTable = ({ title, description, detail, columns, rows, keys, page, size, total, onPage, collapsed = false, onToggle }: DataTableProps) => {
  const open = !onToggle || !collapsed
  const head = (
    <>
      <h3 className={TITLE_CLASS}>{title}</h3>
      <span className={DETAIL_CLASS}>{detail}</span>
    </>
  )
  return (
    <section className={CARD_CLASS}>
      <div className={HEAD_CLASS}>
        {onToggle ? (
          <button type="button" className={TOGGLE_CLASS} aria-expanded={open} aria-label={open ? COLLAPSE_ARIA : EXPAND_ARIA} onClick={onToggle}>
            <span className={`${CHEVRON_CLASS} ${open ? CHEVRON_OPEN_CLASS : ''}`}>▶</span>
            {head}
          </button>
        ) : (
          head
        )}
      </div>
      <p className={DESCRIPTION_CLASS}>{description}</p>
      {!open ? null : total === 0 ? (
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
                <tr key={keys[index]} className={ROW_CLASS}>
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
      {open ? <Pager page={page} size={size} total={total} onPage={onPage} /> : null}
    </section>
  )
}

export default DataTable
