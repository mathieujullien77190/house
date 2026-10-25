import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { KeyForm } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './KeyForm.en.md?raw'
import fr from './KeyForm.fr.md?raw'
import keyCode from './Key.source.md?raw'

const HINT = 'La clé de House API (API_KEY dans le fichier .env du PC). Elle reste dans cet onglet.'

/** La valeur et la vérification sont au parent : ici, « vérifier » dure une seconde puis vide le champ. */
const Key = () => {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = () => {
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      setValue('')
    }, 1000)
  }
  return <KeyForm value={value} busy={busy} hint={HINT} onChange={setValue} onSubmit={submit} />
}

const meta: Meta<typeof KeyForm> = {
  title: 'Formulaires/KeyForm',
  component: KeyForm,
  parameters: prose({ fr, en }),
}

export default meta

export const KeyStory: StoryObj<typeof KeyForm> = {
  name: 'Key',
  parameters: source(keyCode),
  render: () => <Key />,
}
