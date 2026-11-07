import { INPUT_CLASS, WRAP_CLASS } from './constants'
import type { CheckboxProps } from './types'

/** Une case à cocher et son texte (le texte est cliquable aussi). Le choix reste au parent. */
const Checkbox = ({ label, checked, onChange, disabled = false }: CheckboxProps) => (
  <label className={WRAP_CLASS}>
    <input type="checkbox" className={INPUT_CLASS} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    {label}
  </label>
)

export default Checkbox
