import { useState } from 'react'
import { KeyForm as KeyFormUI } from '@house/ui'
import { HINT } from './constants'
import type { KeyFormProps } from './types'

/** Saisie de la clé : le champ est vidé dès l'envoi, la clé ne reste pas dans le formulaire. */
const KeyForm = ({ busy, onSubmit }: KeyFormProps) => {
  const [value, setValue] = useState('')
  const submit = () => {
    if (!value) return
    onSubmit(value)
    setValue('')
  }
  return <KeyFormUI value={value} busy={busy} hint={HINT} onChange={setValue} onSubmit={submit} />
}

export default KeyForm
