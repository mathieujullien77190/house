import { useState, type FormEvent } from 'react'
import { Button } from '@house/ui'
import {
  CODE_FORM_CLASS,
  CODE_INPUT_CLASS,
  CODE_LABEL,
  CODE_LENGTH,
  ERROR_CLASS,
  NOT_PAIRED_TITLE,
  PAIRING_INTRO,
  PAIRING_STEPS,
  RESTART_LABEL,
  START_LABEL,
  STARTING_LABEL,
  STEP_CURRENT_CLASS,
  STEPS_CLASS,
  SUBMIT_LABEL,
  VALIDATING_LABEL,
  WIDE_BUTTON_CLASS,
} from './constants'
import { cleanCode, isCodeComplete } from './helpers'
import type { PairingProps } from './types'

/** Les trois étapes pour associer le Player : allumer, « Associer » (le code s'affiche sur la TV), saisir le code. */
const Pairing = ({ phase, error, onStart, onSubmit }: PairingProps) => {
  const [code, setCode] = useState('')
  const waiting = phase === 'waiting' || phase === 'validating'
  const current = waiting ? 2 : 0
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (isCodeComplete(code)) onSubmit(code)
  }
  return (
    <>
      <strong>{NOT_PAIRED_TITLE}</strong>
      <p>{PAIRING_INTRO}</p>
      <ol className={STEPS_CLASS}>
        {PAIRING_STEPS.map((step, index) => (
          <li key={step} className={index === current ? STEP_CURRENT_CLASS : undefined}>
            {step}
          </li>
        ))}
      </ol>
      {waiting ? (
        <form className={CODE_FORM_CLASS} onSubmit={submit}>
          <input
            type="text"
            value={code}
            maxLength={CODE_LENGTH}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-label={CODE_LABEL}
            disabled={phase === 'validating'}
            className={CODE_INPUT_CLASS}
            onChange={(event) => setCode(cleanCode(event.target.value))}
          />
          <Button type="submit" variant="active" disabled={phase === 'validating' || !isCodeComplete(code)}>
            {phase === 'validating' ? VALIDATING_LABEL : SUBMIT_LABEL}
          </Button>
        </form>
      ) : null}
      {waiting ? (
        <Button className={WIDE_BUTTON_CLASS} disabled={phase === 'validating'} onClick={onStart}>
          {RESTART_LABEL}
        </Button>
      ) : (
        <Button className={WIDE_BUTTON_CLASS} variant="active" disabled={phase === 'starting'} onClick={onStart}>
          {phase === 'starting' ? STARTING_LABEL : START_LABEL}
        </Button>
      )}
      {error ? (
        <p className={ERROR_CLASS} role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}

export default Pairing
