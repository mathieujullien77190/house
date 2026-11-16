import { useEffect, useState } from 'react'
import { Notice } from '@house/ui'
import { fetchServos, saveServos, testServo } from '@/lib/api'
import { LOAD_ERROR_TEXT } from './constants'
import { patchOf } from './helpers'
import ServosSettingsUI from './UI'
import type { ServoCommand, ServoSettings } from './types'

/** Le contenu du bloc « Volets à servos » des réglages : l'adresse de l'ESP32 et, pour chaque volet (salon, PC, porte), les cinq champs de Monter, Descendre et Stop. Chaque champ est enregistré en le quittant (ou Entrée) ; un refus remet la valeur gardée. */
const ServosSettings = () => {
  const [settings, setSettings] = useState<ServoSettings | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [failed, setFailed] = useState(false)
  const [loadError, setLoadError] = useState(false)
  // Le test en cours et celui qui a échoué (`<volet>.<ordre>`).
  const [testing, setTesting] = useState<string | null>(null)
  const [testFailed, setTestFailed] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchServos()
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

  const dropDraft = (key: string) => setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== key)))

  const commit = (key: string) => {
    const text = drafts[key]
    if (text === undefined || settings === null) return
    const patch = patchOf(settings, key, text)
    if (patch === null) {
      dropDraft(key)
      return
    }
    saveServos(patch)
      .then((saved) => {
        setFailed(false)
        setSettings(saved)
      })
      .catch(() => setFailed(true))
      .finally(() => dropDraft(key))
  }

  const test = (shutter: string, command: ServoCommand, origin = false) => {
    const key = `${shutter}.${command}`
    setTesting(key)
    setTestFailed(null)
    testServo(shutter, command, origin)
      .catch(() => setTestFailed(key))
      .finally(() => setTesting(null))
  }

  if (loadError) return <Notice text={LOAD_ERROR_TEXT} />
  if (settings === null) return null
  return (
    <ServosSettingsUI
      settings={settings}
      drafts={drafts}
      failed={failed}
      testing={testing}
      testFailed={testFailed}
      onTest={test}
      onOrigin={(shutter, command) => test(shutter, command, true)}
      onDraft={(key, text) => setDrafts((current) => ({ ...current, [key]: text }))}
      onCommit={commit}
    />
  )
}

export default ServosSettings
