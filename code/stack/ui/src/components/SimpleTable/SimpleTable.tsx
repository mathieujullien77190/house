import { BODY_CLASS, CELL_CLASS, HEAD_CELL_CLASS, HEAD_GROUP_CLASS, ROW_CLASS, TABLE_CLASS, WRAP_CLASS } from './constants'
import type { SimpleTableProps } from './types'

/** Un tableau quadrillé, sans pagination ni carte : des titres de colonnes et des lignes déjà rendues. Sur téléphone, une fiche par ligne. */
const SimpleTable = ({ columns, rows, keys }: SimpleTableProps) => (
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
        {rows.map((cells, index) => (
          <tr key={keys[index]} className={ROW_CLASS}>
            {cells.map((cell, column) => (
              <td key={columns[column]} data-label={columns[column]} className={CELL_CLASS}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default SimpleTable
