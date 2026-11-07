import { Fragment } from 'react'
import Pager from '../Pager'
import {
  BODY_CLASS,
  CARD_CLASS,
  CELL_CLASS,
  CHEVRON_CLASS,
  CHEVRON_OPEN_CLASS,
  COLLAPSE_ARIA,
  DESCRIPTION_CLASS,
  DETAIL_CELL_CLASS,
  DETAIL_CLASS,
  DETAIL_ROW_CLASS,
  EMPTY_CLASS,
  EMPTY_TEXT,
  EXPAND_ARIA,
  FILTERS_CLASS,
  HINT_ARROW,
  HINT_CELL_CLASS,
  LESS_TEXT,
  MORE_TEXT,
  HEAD_CELL_CLASS,
  HEAD_CLASS,
  HEAD_GROUP_CLASS,
  ROW_CLASS,
  ROW_CLICK_CLASS,
  ROW_OPEN_CLASS,
  TABLE_CLASS,
  TITLE_CLASS,
  TOGGLE_CLASS,
  VALUE_CLASS,
  WRAP_CLASS,
} from './constants'
import type { DataTableProps } from './types'

/** Un tableau paginé dans une carte, repliable si le parent le demande : les cellules arrivent déjà rendues. Avec `details`, une ligne se déplie au clic et montre son détail dessous. */
const DataTable = ({ title, description, detail, columns, rows, keys, page, size, total, onPage, collapsed = false, onToggle, details, openKey = null, onRowClick, filters }: DataTableProps) => {
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
      {open && filters ? <div className={FILTERS_CLASS}>{filters}</div> : null}
      {!open ? null : total === 0 ? (
        <p className={EMPTY_CLASS}>{EMPTY_TEXT}</p>
      ) : (
        <div className={WRAP_CLASS}>
          <table className={TABLE_CLASS}>
            <thead className={HEAD_GROUP_CLASS}>
              <tr>
                {columns.map((column) => (
                  <th key={column} className={HEAD_CELL_CLASS}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={BODY_CLASS}>
              {rows.map((cells, index) => {
                const detail = details?.[index] ?? null
                const clickable = onRowClick !== undefined && detail !== null
                const isOpen = clickable && openKey === keys[index]
                return (
                  <Fragment key={keys[index]}>
                    <tr
                      className={`${ROW_CLASS}${clickable ? ` ${ROW_CLICK_CLASS}` : ''}${isOpen ? ` ${ROW_OPEN_CLASS}` : ''}`}
                      tabIndex={clickable ? 0 : undefined}
                      aria-expanded={clickable ? isOpen : undefined}
                      onClick={
                        clickable
                          ? (event) => {
                              // Un lien ou un bouton de la ligne garde son propre clic.
                              if ((event.target as HTMLElement).closest('a, button')) return
                              onRowClick(keys[index])
                            }
                          : undefined
                      }
                      onKeyDown={
                        clickable
                          ? (event) => {
                              if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                                event.preventDefault()
                                onRowClick(keys[index])
                              }
                            }
                          : undefined
                      }
                    >
                      {cells.map((cell, column) => (
                        <td key={columns[column]} data-label={columns[column]} className={CELL_CLASS}>
                          <span className={VALUE_CLASS}>{cell}</span>
                        </td>
                      ))}
                      {clickable ? (
                        <td colSpan={columns.length} className={HINT_CELL_CLASS} aria-hidden="true">
                          {isOpen ? `${HINT_ARROW[1]} ${LESS_TEXT}` : `${HINT_ARROW[0]} ${MORE_TEXT}`}
                        </td>
                      ) : null}
                    </tr>
                    {isOpen ? (
                      <tr className={DETAIL_ROW_CLASS}>
                        <td colSpan={columns.length} className={DETAIL_CELL_CLASS}>
                          {detail}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {open ? <Pager page={page} size={size} total={total} onPage={onPage} /> : null}
    </section>
  )
}

export default DataTable
