import { useEffect, useState } from 'react'
import { Notice } from '@house/ui'
import { fetchLanAccess, saveLanAccess } from '@/lib/api'
import { LOAD_ERROR_TEXT } from './constants'
import LanAccessUI from './UI'
import type { LanAccessKey, LanAccessSettings } from './types'

/** Le contenu du bloc « Page invité du réseau » des réglages : cinq interrupteurs (le général et les quatre fonctions), enregistrés tout de suite, et l'adresse de la page. House API relit le document à chaque demande. */
const LanAccess = () => {
  const [settings, setSettings] = useState<LanAccessSettings | null>(null)
  const [failed, setFailed] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLanAccess()
      .then((result) => {
        if (!cancelled) setSettings(result)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const change = (key: LanAccessKey, on: boolean) => {
    saveLanAccess({ [key]: on })
      .then((saved) => {
        setFailed(false)
        setSettings(saved)
      })
      .catch(() => setFailed(true))
  }

  if (loadError) return <Notice text={LOAD_ERROR_TEXT} />
  if (settings === null) return null
  return <LanAccessUI settings={settings} failed={failed} onChange={change} />
}

export default LanAccess
