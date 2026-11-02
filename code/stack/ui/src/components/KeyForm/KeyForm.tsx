import Button from '../Button'
import { FORM_CLASS, HINT_CLASS, INPUT_CLASS, INPUT_ID, LABEL, SUBMIT_LABEL } from './constants'
import type { KeyFormProps } from './types'

/** Le formulaire de la clé secrète ; la valeur et son envoi sont au parent. */
const KeyForm = ({ value, busy, hint, onChange, onSubmit }: KeyFormProps) => {
  return (
    <form
      className={FORM_CLASS}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label htmlFor={INPUT_ID}>{LABEL}</label>
      <input
        id={INPUT_ID}
        type="password"
        autoComplete="current-password"
        required
        disabled={busy}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
      <Button type="submit" variant="active" disabled={busy || !value}>
        {SUBMIT_LABEL}
      </Button>
      <p className={HINT_CLASS}>{hint}</p>
    </form>
  )
}

export default KeyForm
