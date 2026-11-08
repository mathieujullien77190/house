import Button from '../Button'
import Select from '../Select'
import { FIELD_CLASS, INPUT_CLASS, LABEL_CLASS, ROW_CLASS } from './constants'
import type { TableFiltersProps } from './types'

/** Les filtres d'un tableau : le choix d'une valeur (une liste), un jour, et un bouton pour tout effacer ; des commandes en plus avant eux (`children`). */
const TableFilters = ({ match, date, clear, children }: TableFiltersProps) => {
  const active = (match !== undefined && match.value !== '') || (date !== undefined && date.value !== '')
  // Une valeur choisie qui n'est pas (encore) dans la liste y reste, pour que la liste la montre.
  const options =
    match === undefined || match.value === '' || match.options.includes(match.value)
      ? (match?.options ?? [])
      : [match.value, ...match.options]
  return (
    <div className={ROW_CLASS}>
      {children}
      {match ? (
        <div className={FIELD_CLASS}>
          <span className={LABEL_CLASS}>{match.label}</span>
          <Select
            label={match.label}
            options={[{ value: '', label: match.allLabel }, ...options.map((option) => ({ value: option, label: option }))]}
            value={match.value}
            onChange={match.onChange}
          />
        </div>
      ) : null}
      {date ? (
        <label className={FIELD_CLASS}>
          <span className={LABEL_CLASS}>{date.label}</span>
          <input type="date" className={INPUT_CLASS} value={date.value} onChange={(event) => date.onChange(event.target.value)} />
        </label>
      ) : null}
      {clear && active ? <Button onClick={clear.onClear}>{clear.label}</Button> : null}
    </div>
  )
}

export default TableFilters
