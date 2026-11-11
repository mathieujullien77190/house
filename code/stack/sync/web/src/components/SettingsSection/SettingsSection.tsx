import { useEffect, useState } from 'react'
import { Collapsible, Notice, Tabs } from '@house/ui'
import GuestLink from '@/components/GuestLink'
import { fetchGuest, fetchRetention, fetchSettings, saveGuest, saveRetention, saveSetting } from '@/lib/api'
import {
  CHOICES_CLASS,
  CLIPS_LABEL,
  CLIPS_OPTIONS,
  ORIENTATION_LABEL,
  ORIENTATION_OPTIONS,
  FPS_FULL_TEXT,
  FPS_MAX,
  FPS_MIN,
  FPS_SLIDERS,
  FPS_UNIT,
  GROUP_CLASS,
  GUEST_FPS_LABEL,
  GUEST_POWER_LABEL,
  GUEST_POWER_OPTIONS,
  LABEL_CLASS,
  LOAD_ERROR_TEXT,
  NAME_CLASS,
  RETENTION_LABEL,
  RETENTION_OPTIONS,
  ROW_CLASS,
  SAVE_ERROR_TEXT,
  SECTION_DETECTION,
  SECTION_GENERAL,
  SECTION_GUEST,
  SECTION_LIVE,
  SECTION_RECORDING,
  MIN_SECONDS_LABEL,
  MIN_SECONDS_MAX,
  MIN_SECONDS_MIN,
  minSecondsText,
  SENSITIVITY_LABEL,
  SENSITIVITY_MAX,
  SENSITIVITY_MIN,
  SENSITIVITY_TEXTS,
  SLIDER_CLASS,
  SLIDER_GROUP_CLASS,
  SLIDER_HEAD_CLASS,
  SLIDERS_CLASS,
  RAIN_CLOUD,
  RAIN_CLOUD_HINT,
  EYES_HINT,
  EYES_LABEL,
  EYES_OPTIONS,
  RAIN_LABEL,
  RAIN_NOW_TEXT,
  RAIN_OPTIONS,
  SNAPSHOT_LABEL,
  SNAPSHOT_OPTIONS,
  VALUE_CLASS,
} from './constants'
import type { GuestSettings } from '@/lib/api'
import type { CameraSetting } from './types'

/**
 * Tous les réglages de House Sync : un bloc général (durée de garde des clips), **un bloc par caméra** qui réunit tous ses réglages (enregistrement, détection du mouvement,
 * direct de la WebApp) et la page invité. Chaque clic ou curseur relâché est enregistré tout de suite.
 */
const SettingsSection = () => {
  const [settings, setSettings] = useState<CameraSetting[]>([])
  // La valeur du curseur pendant qu'on le glisse, par caméra : elle n'est envoyée qu'au relâchement.
  const [draft, setDraft] = useState<Record<string, number>>({})
  // Un réglage qui ne s'enregistre pas (ou des réglages illisibles) : un message, au lieu d'un curseur qui garde une valeur jamais prise en compte.
  const [error, setError] = useState('')
  // La durée de garde des clips (jours), la même pour toutes les caméras ; null tant qu'elle n'est pas lue.
  const [retention, setRetention] = useState<number | null>(null)
  // La page invité : ses images par seconde (toutes les caméras) et son interrupteur ; null tant qu’ils ne sont pas lus. Et la valeur du curseur en train de bouger.
  const [guest, setGuest] = useState<GuestSettings | null>(null)
  const [guestDraft, setGuestDraft] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const failed = () => {
      if (!cancelled) setError(LOAD_ERROR_TEXT)
    }
    fetchRetention()
      .then((days) => {
        if (!cancelled) setRetention(days)
      })
      .catch(failed)
    fetchGuest()
      .then((result) => {
        if (!cancelled) setGuest(result)
      })
      .catch(failed)
    fetchSettings()
      .then((result) => {
        if (!cancelled) setSettings(result)
      })
      .catch(failed)
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

  // Le curseur de la page invité relâché : rien n’est envoyé si la valeur n’a pas changé ; en cas d’échec il revient à la valeur gardée.
  const commitGuest = (value: number) => {
    if (value === guest?.guest_fps) {
      setGuestDraft(null)
      return
    }
    saveGuest({ guest_fps: value })
      .then((result) => {
        setError('')
        setGuest(result)
      })
      .catch(() => setError(SAVE_ERROR_TEXT))
      .finally(() => setGuestDraft(null))
  }

  // L’interrupteur : un clic coupe ou remet la page invité tout de suite.
  const switchGuest = (enabled: boolean) => {
    saveGuest({ guest_enabled: enabled })
      .then((result) => {
        setError('')
        setGuest(result)
      })
      .catch(() => setError(SAVE_ERROR_TEXT))
  }

  return (
    <div>
      {error ? <Notice text={error} /> : null}

      <Collapsible title={SECTION_GENERAL}>
        {retention !== null ? (
          <div className={ROW_CLASS}>
            <div className={GROUP_CLASS}>
              <span className={LABEL_CLASS}>{RETENTION_LABEL}</span>
              <Tabs
                label={RETENTION_LABEL}
                options={[...RETENTION_OPTIONS]}
                value={String(retention)}
                onChange={(id) => {
                  saveRetention(Number(id))
                    .then((days) => {
                      setError('')
                      setRetention(days)
                    })
                    .catch(() => setError(SAVE_ERROR_TEXT))
                }}
              />
            </div>
          </div>
        ) : null}
      </Collapsible>

      {settings.map((setting) => {
        const level = draft[`${setting.camera}:motion`] ?? setting.motion_sensitivity
        const minSeconds = draft[`${setting.camera}:minseconds`] ?? setting.motion_min_seconds
        // Le petit icône du mode pluie : seulement quand la caméra est vraiment en mode pluie (il pleut et le mode s'applique) ; rien sinon, même si le mode est allumé.
        const cloud = setting.rain_now && setting.rain_now !== 'off' ? setting.rain_now : null
        return (
          <Collapsible
            key={setting.camera}
            title={setting.camera}
            detail={
              cloud ? (
                <span title={RAIN_CLOUD_HINT[cloud]} role="img" aria-label={RAIN_CLOUD_HINT[cloud]}>
                  {RAIN_CLOUD[cloud]}
                </span>
              ) : undefined
            }
          >
            <div className={ROW_CLASS}>
              <span className={NAME_CLASS}>{SECTION_RECORDING}</span>
              <div className={CHOICES_CLASS}>
                <div className={GROUP_CLASS}>
                  <span className={LABEL_CLASS}>{CLIPS_LABEL}</span>
                  <Tabs
                    label={CLIPS_LABEL}
                    options={[...CLIPS_OPTIONS]}
                    value={setting.clips_mode}
                    onChange={(id) => change(setting.camera, { clips_mode: id })}
                  />
                </div>
                <div className={GROUP_CLASS}>
                  <span className={LABEL_CLASS}>{RAIN_LABEL}</span>
                  <Tabs
                    label={RAIN_LABEL}
                    options={[...RAIN_OPTIONS]}
                    value={setting.rain_mode ?? 'off'}
                    onChange={(id) => change(setting.camera, { rain_mode: id })}
                  />
                  {setting.rain_now && setting.rain_now !== 'off' ? (
                    <span className={LABEL_CLASS}>{RAIN_NOW_TEXT[setting.rain_now]}</span>
                  ) : null}
                </div>
                <div className={GROUP_CLASS}>
                  <span className={LABEL_CLASS}>{EYES_LABEL}</span>
                  <Tabs
                    label={EYES_LABEL}
                    options={[...EYES_OPTIONS]}
                    value={setting.eyes_mode ?? 'off'}
                    onChange={(id) => change(setting.camera, { eyes_mode: id })}
                  />
                  <span className={LABEL_CLASS}>{EYES_HINT}</span>
                </div>
                <div className={GROUP_CLASS}>
                  <span className={LABEL_CLASS}>{ORIENTATION_LABEL}</span>
                  <Tabs
                    label={ORIENTATION_LABEL}
                    options={[...ORIENTATION_OPTIONS]}
                    value={setting.orientation}
                    onChange={(id) => change(setting.camera, { orientation: id })}
                  />
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
            </div>

            <div className={ROW_CLASS}>
              <span className={NAME_CLASS}>{SECTION_DETECTION}</span>
              <div className={SLIDERS_CLASS}>
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
                    aria-label={`${SENSITIVITY_LABEL} · ${setting.camera}`}
                    className={SLIDER_CLASS}
                    onChange={(event) => setDraft((current) => ({ ...current, [`${setting.camera}:motion`]: Number(event.target.value) }))}
                    onPointerUp={(event) =>
                      commit(setting, 'motion_sensitivity', Number(event.currentTarget.value), `${setting.camera}:motion`)
                    }
                    onKeyUp={(event) =>
                      commit(setting, 'motion_sensitivity', Number(event.currentTarget.value), `${setting.camera}:motion`)
                    }
                  />
                </div>
                <div className={SLIDER_GROUP_CLASS}>
                  <div className={SLIDER_HEAD_CLASS}>
                    <span className={LABEL_CLASS}>{MIN_SECONDS_LABEL}</span>
                    <span className={VALUE_CLASS}>{minSecondsText(minSeconds)}</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_SECONDS_MIN}
                    max={MIN_SECONDS_MAX}
                    value={minSeconds}
                    aria-label={`${MIN_SECONDS_LABEL} · ${setting.camera}`}
                    className={SLIDER_CLASS}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [`${setting.camera}:minseconds`]: Number(event.target.value) }))
                    }
                    onPointerUp={(event) =>
                      commit(setting, 'motion_min_seconds', Number(event.currentTarget.value), `${setting.camera}:minseconds`)
                    }
                    onKeyUp={(event) =>
                      commit(setting, 'motion_min_seconds', Number(event.currentTarget.value), `${setting.camera}:minseconds`)
                    }
                  />
                </div>
              </div>
            </div>

            <div className={ROW_CLASS}>
              <span className={NAME_CLASS}>{SECTION_LIVE}</span>
              <div className={SLIDERS_CLASS}>
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
                        aria-label={`${label} · ${setting.camera}`}
                        className={SLIDER_CLASS}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, [`${setting.camera}:${key}`]: Number(event.target.value) }))
                        }
                        onPointerUp={(event) => commit(setting, key, Number(event.currentTarget.value), `${setting.camera}:${key}`)}
                        onKeyUp={(event) => commit(setting, key, Number(event.currentTarget.value), `${setting.camera}:${key}`)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </Collapsible>
        )
      })}

      <Collapsible title={SECTION_GUEST}>
        {guest !== null ? (
          <div className={ROW_CLASS}>
            <div className={GROUP_CLASS}>
              <span className={LABEL_CLASS}>{GUEST_POWER_LABEL}</span>
              <Tabs
                label={GUEST_POWER_LABEL}
                options={[...GUEST_POWER_OPTIONS]}
                value={guest.guest_enabled ? 'on' : 'off'}
                onChange={(id) => switchGuest(id === 'on')}
              />
            </div>
          </div>
        ) : null}
        {guest !== null ? (
          <div className={ROW_CLASS}>
            <div className={SLIDERS_CLASS}>
              <div className={SLIDER_GROUP_CLASS}>
                <div className={SLIDER_HEAD_CLASS}>
                  <span className={LABEL_CLASS}>{GUEST_FPS_LABEL}</span>
                  <span className={VALUE_CLASS}>{`${guestDraft ?? guest.guest_fps}${FPS_UNIT}`}</span>
                </div>
                <input
                  type="range"
                  min={FPS_MIN}
                  max={FPS_MAX}
                  value={guestDraft ?? guest.guest_fps}
                  aria-label={GUEST_FPS_LABEL}
                  className={SLIDER_CLASS}
                  onChange={(event) => setGuestDraft(Number(event.target.value))}
                  onPointerUp={(event) => commitGuest(Number(event.currentTarget.value))}
                  onKeyUp={(event) => commitGuest(Number(event.currentTarget.value))}
                />
              </div>
            </div>
          </div>
        ) : null}
        {guest?.guest_link ? (
          <div className={ROW_CLASS}>
            <GuestLink info={guest.guest_link} />
          </div>
        ) : null}
      </Collapsible>
    </div>
  )
}

export default SettingsSection
