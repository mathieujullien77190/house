import SelectUI from './UI'
import { readValue } from './helpers'
import type { SelectProps } from './types'

const Select = ({ onChange, ...rest }: SelectProps) => {
  return <SelectUI {...rest} onChange={(e) => onChange(readValue(e))} />
}

export default Select
