import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ApiExplorer, type ApiResult } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './ApiExplorer.en.md?raw'
import fr from './ApiExplorer.fr.md?raw'
import servicesCode from './Services.source.md?raw'

const SERVICES = [
  { path: '/welcome', description: 'Le service de bienvenue : l’API est là. Sans clé.', secured: false },
  { path: '/auth', description: 'Vérifie la clé : ok si elle est bonne, 401 sinon.', secured: true },
  { path: '/events?last=1', description: 'Le dernier événement de chaque caméra.', secured: true },
]

const ANSWERS: Record<string, ApiResult> = {
  '/welcome': { path: '/welcome', status: 200, body: '{\n  "service": "house-api",\n  "message": "Welcome to House API"\n}' },
  '/auth': { path: '/auth', status: 200, body: '{\n  "ok": true\n}' },
  '/events?last=1': { path: '/events?last=1', status: 200, body: '[\n  {\n    "id": "1792941234.588848-jlzqs5",\n    "camera": "portail",\n    "label": "person"\n  }\n]' },
}

/** L'appel est au parent : ici, une réponse toute faite après un court délai. */
const Services = () => {
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ApiResult | null>(null)
  const call = (path: string) => {
    setSelected(path)
    setBusy(true)
    setResult(null)
    setTimeout(() => {
      setResult(ANSWERS[path] ?? { path, status: 404, body: '{ "error": "not found" }' })
      setBusy(false)
    }, 400)
  }
  return (
    <ApiExplorer
      services={SERVICES}
      selected={selected}
      busy={busy}
      result={result}
      note="/clips/<id> renvoie la vidéo d’un événement (mp4) : pas de JSON."
      onCall={call}
    />
  )
}

const meta: Meta<typeof ApiExplorer> = {
  title: 'Pages/ApiExplorer',
  component: ApiExplorer,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const ServicesStory: StoryObj<typeof ApiExplorer> = {
  name: 'Services',
  parameters: source(servicesCode),
  render: () => <Services />,
}
