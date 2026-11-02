import { useState } from 'react'
import { ApiExplorer as ApiExplorerUI, type ApiResult } from '@house/ui'
import { callService } from '@/lib/api'
import { CLIPS_NOTE, SERVICES } from './constants'
import { prettify } from './helpers'
import type { ApiExplorerProps } from './types'

/** L'explorateur de House API : la liste des services, et la réponse de celui qu'on appelle. */
const ApiExplorer = ({ apiKey }: ApiExplorerProps) => {
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ApiResult | null>(null)

  const call = async (path: string) => {
    setSelected(path)
    setBusy(true)
    setResult(null)
    try {
      const { status, body } = await callService(apiKey, path)
      setResult({ path, status, body: prettify(body) })
    } catch (error) {
      setResult({ path, status: 0, body: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  return <ApiExplorerUI services={SERVICES} selected={selected} busy={busy} result={result} note={CLIPS_NOTE} onCall={call} />
}

export default ApiExplorer
