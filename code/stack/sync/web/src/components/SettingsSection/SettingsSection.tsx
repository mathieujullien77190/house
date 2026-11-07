import { useEffect, useState } from 'react'
import { Notice, Tabs } from '@house/ui'
import { fetchSettings, saveSetting } from '@/lib/api'
import { CLIPS_LABEL, CLIPS_OPTIONS, DESCRIPTION, FPS_FULL_TEXT, FPS_MAX, FPS_MIN, FPS_NOTE, FPS_SLIDERS, FPS_UNIT, CHOICES_CLASS, GROUP_CLASS, LABEL_CLASS, LOAD_ERROR_TEXT, NAME_CLASS, NOTE, ROW_CLASS, SAVE_ERROR_TEXT, SENSITIVITY_LABEL, SENSITIVITY_MAX, SENSITIVITY_MIN, SENSITIVITY_NOTE, SENSITIVITY_TEXTS, SLIDER_CLASS, SLIDER_GROUP_CLASS, SLIDER_HEAD_CLASS, SLIDERS_CLASS, SNAPSHOT_LABEL, SNAPSHOT_OPTIONS, VALUE_CLASS } from './constants'
import type { CameraSetting } from './types'

/** Les réglages de la sauvegarde, caméra par caméra : les clips gardés ou non, le rythme des images. Chaque clic est enregistré tout de suite. */
const SettingsSection = () => {
  const [settings, setSettings] = useState<CameraSetting[]>([])
  // La valeur du curseur pendant qu'on le glisse, par caméra : elle n'est envoyée qu'au relâchement.
  const [draft, setDraft] = useState<Record<string, number>>({})
  // Un réglage qui ne s'enregistre pas (ou des réglages illisibles) : un message, au lieu d'un curseur qui garde une valeur jamais prise en compte.
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchSettings()
      .then((result) => {
        if (!cancelled) setSettings(result)
      })
      .catch(() => {
        if (!cancelled) setError(LOAD_ERROR_TEXT)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const change = (camera: string, patch: Partial<Omit<CameraSetting, 'camera'>>, draftKey = '') => {
    saveSetting(camera, patch)
      .then((saved) => {
        setError('')
        setSettings((current) => current.map((setting) => (setting.camera === camera ? saved : setting)))
        setDraft((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== draftKey)))
      })
      .catch(() => {
        // Le curseur revient à la valeur gardée (celle qui est vraiment enregistrée), et un message le dit.
        setError(SAVE_ERROR_TEXT)
        setDraft((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== draftKey)))
      })
  }

  // Un curseur relâché (souris ou clavier) n'envoie rien si sa valeur n'a pas changé (un Tab qui arrive sur lui, un clic sans glisser).
  const commit = (setting: CameraSetting, key: keyof Omit<CameraSetting, 'camera'>, value: number, draftKey: string) => {
    if (value === setting[key]) {
      setDraft((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== draftKey)))
      return
    }
    change(setting.camera, { [key]: value }, draftKey)
  }

  return (
    <div>
      <p className={LABEL_CLASS}>{DESCRIPTION}</p>
      {error ? <Notice text={error} /> : null}
      {settings.map((setting) => (
        <div key={setting.camera} className={ROW_CLASS}>
          <span className={NAME_CLASS}>{setting.camera}</span>
          <div className={CHOICES_CLASS}>
            <div className={GROUP_CLASS}>
              <span className={LABEL_CLASS}>{CLIPS_LABEL}</span>
              <Tabs label={CLIPS_LABEL} options={[...CLIPS_OPTIONS]} value={setting.clips_mode} onChange={(id) => change(setting.camera, { clips_mode: id })} />
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
          <div className={SLIDERS_CLASS}>
            {(() => {
              const level = draft[`${setting.camera}:motion`] ?? setting.motion_sensitivity
              return (
                <div className={SLIDER_GROUP_CLASS}>
                  <div className={SLIDER_HEAD_CLASS}>
                    <span className={LABEL_CLASS}>{SENSITIVITY_LABEL}</span>
                    <span className={VALUE_CLASS}>{SENSITIVITY_TEXTS[level]}</span>
                  </div>
                  <input
                    type="range"
                    min={SENSITIVITY_MIN}
                    max={SENSITIVITY_MAX}
                    value={level}
                    aria-label={SENSITIVITY_LABEL}
                    className={SLIDER_CLASS}
                    onChange={(event) => setDraft((current) => ({ ...current, [`${setting.camera}:motion`]: Number(event.target.value) }))}
                    onPointerUp={(event) => commit(setting, 'motion_sensitivity', Number(event.currentTarget.value), `${setting.camera}:motion`)}
                    onKeyUp={(event) => commit(setting, 'motion_sensitivity', Number(event.currentTarget.value), `${setting.camera}:motion`)}
                  />
                </div>
              )
            })()}
            {FPS_SLIDERS.map(({ key, label }) => {
              const value = draft[`${setting.camera}:${key}`] ?? setting[key]
              return (
                <div key={key} className={SLIDER_GROUP_CLASS}>
                  <div className={SLIDER_HEAD_CLASS}>
                    <span className={LABEL_CLASS}>{label}</span>
                    <span className={VALUE_CLASS}>{value >= FPS_MAX ? FPS_FULL_TEXT : `${value}${FPS_UNIT}`}</span>
                  </div>
                  <input
                    type="range"
                    min={FPS_MIN}
                    max={FPS_MAX}
                    value={value}
                    aria-label={label}
                    className={SLIDER_CLASS}
                    onChange={(event) => setDraft((current) => ({ ...current, [`${setting.camera}:${key}`]: Number(event.target.value) }))}
                    onPointerUp={(event) => commit(setting, key, Number(event.currentTarget.value), `${setting.camera}:${key}`)}
                    onKeyUp={(event) => commit(setting, key, Number(event.currentTarget.value), `${setting.camera}:${key}`)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <Notice text={NOTE} />
      <Notice text={FPS_NOTE} />
      <Notice text={SENSITIVITY_NOTE} />
    </div>
  )
}

export default SettingsSection
