import { useEffect, useState } from 'react'
import { Notice, Tabs } from '@house/ui'
import { fetchSettings, saveSetting } from '@/lib/api'
import { CLIPS_LABEL, CLIPS_OPTIONS, DESCRIPTION, FPS_FULL_TEXT, FPS_LABEL, FPS_MAX, FPS_MIN, FPS_NOTE, FPS_UNIT, GROUP_CLASS, LABEL_CLASS, LIGHT_FPS_LABEL, NAME_CLASS, NOTE, ROW_CLASS, SLIDER_CLASS, SNAPSHOT_LABEL, SNAPSHOT_OPTIONS, VALUE_CLASS } from './constants'
import type { CameraSetting } from './types'

/** Les réglages de la sauvegarde, caméra par caméra : les clips gardés ou non, le rythme des images. Chaque clic est enregistré tout de suite. */
const SettingsSection = () => {
  const [settings, setSettings] = useState<CameraSetting[]>([])
  // La valeur du curseur pendant qu'on le glisse, par caméra : elle n'est envoyée qu'au relâchement.
  const [draft, setDraft] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    fetchSettings()
      .then((result) => {
        if (!cancelled) setSettings(result)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const change = (camera: string, patch: Partial<Omit<CameraSetting, 'camera'>>) => {
    saveSetting(camera, patch)
      .then((saved) => {
        setSettings((current) => current.map((setting) => (setting.camera === camera ? saved : setting)))
        setDraft((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== camera && name !== `${camera}:light`)))
      })
      .catch(() => undefined)
  }

  return (
    <div>
      <p className={LABEL_CLASS}>{DESCRIPTION}</p>
      {settings.map((setting) => (
        <div key={setting.camera} className={ROW_CLASS}>
          <span className={NAME_CLASS}>{setting.camera}</span>
          <div className={GROUP_CLASS}>
            <span className={LABEL_CLASS}>{CLIPS_LABEL}</span>
            <Tabs label={CLIPS_LABEL} options={[...CLIPS_OPTIONS]} value={setting.clips_mode} onChange={(id) => change(setting.camera, { clips_mode: id })} />
          </div>
          <div className={GROUP_CLASS}>
            <span className={LABEL_CLASS}>{FPS_LABEL}</span>
            <input
              type="range"
              min={FPS_MIN}
              max={FPS_MAX}
              value={draft[setting.camera] ?? setting.live_fps}
              aria-label={FPS_LABEL}
              className={SLIDER_CLASS}
              onChange={(event) => setDraft((current) => ({ ...current, [setting.camera]: Number(event.target.value) }))}
              onPointerUp={(event) => change(setting.camera, { live_fps: Number(event.currentTarget.value) })}
              onKeyUp={(event) => change(setting.camera, { live_fps: Number(event.currentTarget.value) })}
            />
            <span className={VALUE_CLASS}>{(draft[setting.camera] ?? setting.live_fps) >= FPS_MAX ? FPS_FULL_TEXT : `${draft[setting.camera] ?? setting.live_fps}${FPS_UNIT}`}</span>
          </div>
          <div className={GROUP_CLASS}>
            <span className={LABEL_CLASS}>{LIGHT_FPS_LABEL}</span>
            <input
              type="range"
              min={FPS_MIN}
              max={FPS_MAX}
              value={draft[`${setting.camera}:light`] ?? setting.light_fps}
              aria-label={LIGHT_FPS_LABEL}
              className={SLIDER_CLASS}
              onChange={(event) => setDraft((current) => ({ ...current, [`${setting.camera}:light`]: Number(event.target.value) }))}
              onPointerUp={(event) => change(setting.camera, { light_fps: Number(event.currentTarget.value) })}
              onKeyUp={(event) => change(setting.camera, { light_fps: Number(event.currentTarget.value) })}
            />
            <span className={VALUE_CLASS}>{(draft[`${setting.camera}:light`] ?? setting.light_fps) >= FPS_MAX ? FPS_FULL_TEXT : `${draft[`${setting.camera}:light`] ?? setting.light_fps}${FPS_UNIT}`}</span>
          </div>
          <div className={GROUP_CLASS}>
            <span className={LABEL_CLASS}>{SNAPSHOT_LABEL}</span>
            <Tabs
              label={SNAPSHOT_LABEL}
              options={[...SNAPSHOT_OPTIONS]}
              value={String(setting.snapshot_seconds)}
              onChange={(id) => change(setting.camera, { snapshot_seconds: Number(id) })}
            />
          </div>
        </div>
      ))}
      <Notice text={NOTE} />
      <Notice text={FPS_NOTE} />
    </div>
  )
}

export default SettingsSection
