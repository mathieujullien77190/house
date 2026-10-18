import { LABEL_CLASS, SELECT_CLASS } from './constants'
import type { SelectUIProps } from './types'

const SelectUI = ({ label, value, options, onChange }: SelectUIProps) => {
  return (
    <label className={LABEL_CLASS}>
      {label}
      <select className={SELECT_CLASS} value={value} onChange={onChange}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default SelectUI
