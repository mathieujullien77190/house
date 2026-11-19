import { useEffect, useState } from 'react'
import { Notice } from '@house/ui'
import { fetchSunsetLights, saveSunsetLights } from '@/lib/api'
import { LOAD_ERROR_TEXT } from './constants'
import SunsetLightsUI from './UI'
import type { SunsetLightsSettings } from './types'

/** Le contenu du bloc « Allumage au coucher du soleil » des réglages : l'interrupteur (enregistré tout de suite), la prochaine heure prévue, le décalage et les lampes. */
const SunsetLights = () => {
  const [settings, setSettings] = useState<SunsetLightsSettings | null>(null)
  const [failed, setFailed] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchSunsetLights()
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

  const change = (enabled: boolean) => {
    saveSunsetLights(enabled)
      .then((saved) => {
        setFailed(false)
        setSettings(saved)
      })
      .catch(() => setFailed(true))
  }

  if (loadError) return <Notice text={LOAD_ERROR_TEXT} />
  if (settings === null) return null
  return <SunsetLightsUI settings={settings} failed={failed} onChange={change} />
}

export default SunsetLights
