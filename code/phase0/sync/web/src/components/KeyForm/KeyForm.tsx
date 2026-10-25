import { useState } from 'react'
import KeyFormUI from './UI'
import type { KeyFormProps } from './types'

/** Saisie de la clé : le champ est vidé dès l'envoi, la clé ne reste pas dans le formulaire. */
const KeyForm = ({ busy, onSubmit }: KeyFormProps) => {
  const [value, setValue] = useState('')
  const submit = () => {
    if (!value) return
    onSubmit(value)
    setValue('')
  }
  return <KeyFormUI value={value} busy={busy} onChange={setValue} onSubmit={submit} />
}

export default KeyForm
