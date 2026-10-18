import FieldUI from './UI'
import { DEFAULT_TYPE } from './constants'
import { readValue } from './helpers'
import type { FieldProps } from './types'

const Field = ({ onChange, type = DEFAULT_TYPE, ...rest }: FieldProps) => {
  return <FieldUI {...rest} type={type} onChange={(e) => onChange(readValue(e))} />
}

export default Field
