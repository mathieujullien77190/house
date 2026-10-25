import Button from '@/components/UI/Button'
import { FORM_CLASS, HINT, HINT_CLASS, INPUT_CLASS, LABEL, SUBMIT_LABEL } from './constants'
import type { KeyFormUIProps } from './types'

const KeyFormUI = ({ value, busy, onChange, onSubmit }: KeyFormUIProps) => {
  return (
    <form
      className={FORM_CLASS}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label htmlFor="house-key">{LABEL}</label>
      <input
        id="house-key"
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
      <p className={`${HINT_CLASS} w-full`}>{HINT}</p>
    </form>
  )
}

export default KeyFormUI
