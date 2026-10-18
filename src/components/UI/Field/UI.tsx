import { INPUT_CLASS, LABEL_CLASS } from './constants'
import type { FieldUIProps } from './types'

const FieldUI = ({ label, ...input }: FieldUIProps) => {
  return (
    <label className={LABEL_CLASS}>
      {label}
      <input className={INPUT_CLASS} {...input} />
    </label>
  )
}

export default FieldUI
