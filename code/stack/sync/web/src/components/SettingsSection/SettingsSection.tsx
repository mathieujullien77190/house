import { useEffect, useState } from 'react'
import { Collapsible, Notice, Tabs } from '@house/ui'
import GuestLink from '@/components/GuestLink'
import LanAccess from '@/components/LanAccess'
import SunsetLights from '@/components/SunsetLights'
import ServosSettings from '@/components/ServosSettings'
import { fetchGuest, fetchSettings, saveGuest, saveSetting } from '@/lib/api'
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
  FOLIAGE_LABEL,
  FOLIAGE_MAX,
  FOLIAGE_MIN,
  foliageText,
  STREAK_HEIGHT_LABEL,
  STREAK_HEIGHT_MAX,
  STREAK_HEIGHT_MIN,
  STREAK_ZONES_LABEL,
  STREAK_ZONES_MAX,
  STREAK_ZONES_MIN,
  streakHeightText,
  streakZonesText,
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
  SECTION_GUEST,
  SECTION_LIVE,
  SECTION_RECORDING,
  SECTION_SUNSET,
  EYES_LABEL,
  EYES_OPTIONS,
  LINK_LABEL,
  LINK_OPTIONS,
  SECTION_SERVOS,
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
  RAIN_LABEL,
  WIND_LABEL,
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
  // La page invité : son interrupteur et son lien ; null tant qu’ils ne sont pas lus.
  const [guest, setGuest] = useState<GuestSettings | null>(null)

  useEffect(() => {
    let cancelled = false
    const failed = () => {
      if (!cancelled) setError(LOAD_ERROR_TEXT)
    }
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

      {settings.map((setting) => {
        const level = draft[`${setting.camera}:motion`] ?? setting.motion_sensitivity
        const minSeconds = draft[`${setting.camera}:minseconds`] ?? setting.motion_min_seconds
        // Le petit icône du mode pluie : seulement quand la caméra est vraiment en mode pluie (il pleut et le mode s'applique) ; rien sinon, même si le mode est allumé.
        const cloud = setting.rain_now && setting.rain_now !== 'off' ? setting.rain_now : null
        return (
          <Collapsible
            key={setting.camera}
            title={setting.camera}
            defaultOpen={false}
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
                  <span className={LABEL_CLASS}>{WIND_LABEL}</span>
                  <Tabs
                    label={WIND_LABEL}
                    options={[...RAIN_OPTIONS]}
                    value={setting.wind_mode ?? 'off'}
                    onChange={(id) => change(setting.camera, { wind_mode: id })}
                  />
                </div>
                <div className={GROUP_CLASS}>
                  <span className={LABEL_CLASS}>{EYES_LABEL}</span>
                  <Tabs
                    label={EYES_LABEL}
                    options={[...EYES_OPTIONS]}
                    value={setting.eyes_mode ?? 'off'}
                    onChange={(id) => change(setting.camera, { eyes_mode: id })}
                  />
                </div>
                <div className={GROUP_CLASS}>
                  <span className={LABEL_CLASS}>{LINK_LABEL}</span>
                  <Tabs
                    label={LINK_LABEL}
                    options={[...LINK_OPTIONS]}
                    value={setting.link_mode ?? 'off'}
                    onChange={(id) => change(setting.camera, { link_mode: id })}
                  />
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
                <div className={GROUP_CLASS}>
                  <span className={LABEL_CLASS}>{RETENTION_LABEL}</span>
                  <Tabs
                    label={RETENTION_LABEL}
                    options={[...RETENTION_OPTIONS]}
                    value={String(setting.clip_retention_days)}
                    onChange={(id) => change(setting.camera, { clip_retention_days: Number(id) })}
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
                <div className={SLIDER_GROUP_CLASS}>
                  <div className={SLIDER_HEAD_CLASS}>
                    <span className={LABEL_CLASS}>{FOLIAGE_LABEL}</span>
                    <span className={VALUE_CLASS}>{foliageText(draft[`${setting.camera}:foliage`] ?? setting.foliage_zones)}</span>
                  </div>
                  <input
                    type="range"
                    min={FOLIAGE_MIN}
                    max={FOLIAGE_MAX}
                    value={draft[`${setting.camera}:foliage`] ?? setting.foliage_zones}
                    aria-label={`${FOLIAGE_LABEL} · ${setting.camera}`}
                    className={SLIDER_CLASS}
                    onChange={(event) => setDraft((current) => ({ ...current, [`${setting.camera}:foliage`]: Number(event.target.value) }))}
                    onPointerUp={(event) => commit(setting, 'foliage_zones', Number(event.currentTarget.value), `${setting.camera}:foliage`)}
                    onKeyUp={(event) => commit(setting, 'foliage_zones', Number(event.currentTarget.value), `${setting.camera}:foliage`)}
                  />
                </div>
                <div className={SLIDER_GROUP_CLASS}>
                  <div className={SLIDER_HEAD_CLASS}>
                    <span className={LABEL_CLASS}>{STREAK_ZONES_LABEL}</span>
                    <span className={VALUE_CLASS}>{streakZonesText(draft[`${setting.camera}:streakzones`] ?? setting.streak_zones)}</span>
                  </div>
                  <input
                    type="range"
                    min={STREAK_ZONES_MIN}
                    max={STREAK_ZONES_MAX}
                    value={draft[`${setting.camera}:streakzones`] ?? setting.streak_zones}
                    aria-label={`${STREAK_ZONES_LABEL} · ${setting.camera}`}
                    className={SLIDER_CLASS}
                    onChange={(event) => setDraft((current) => ({ ...current, [`${setting.camera}:streakzones`]: Number(event.target.value) }))}
                    onPointerUp={(event) => commit(setting, 'streak_zones', Number(event.currentTarget.value), `${setting.camera}:streakzones`)}
                    onKeyUp={(event) => commit(setting, 'streak_zones', Number(event.currentTarget.value), `${setting.camera}:streakzones`)}
                  />
                </div>
                <div className={SLIDER_GROUP_CLASS}>
                  <div className={SLIDER_HEAD_CLASS}>
                    <span className={LABEL_CLASS}>{STREAK_HEIGHT_LABEL}</span>
                    <span className={VALUE_CLASS}>{streakHeightText(draft[`${setting.camera}:streakheight`] ?? setting.streak_height)}</span>
                  </div>
                  <input
                    type="range"
                    min={STREAK_HEIGHT_MIN}
                    max={STREAK_HEIGHT_MAX}
                    value={draft[`${setting.camera}:streakheight`] ?? setting.streak_height}
                    aria-label={`${STREAK_HEIGHT_LABEL} · ${setting.camera}`}
                    className={SLIDER_CLASS}
                    onChange={(event) => setDraft((current) => ({ ...current, [`${setting.camera}:streakheight`]: Number(event.target.value) }))}
                    onPointerUp={(event) => commit(setting, 'streak_height', Number(event.currentTarget.value), `${setting.camera}:streakheight`)}
                    onKeyUp={(event) => commit(setting, 'streak_height', Number(event.currentTarget.value), `${setting.camera}:streakheight`)}
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
            <div className={ROW_CLASS}>
              <span className={NAME_CLASS}>{SECTION_GUEST}</span>
              <div className={SLIDERS_CLASS}>
                <div className={SLIDER_GROUP_CLASS}>
                  <div className={SLIDER_HEAD_CLASS}>
                    <span className={LABEL_CLASS}>{GUEST_FPS_LABEL}</span>
                    <span className={VALUE_CLASS}>{`${draft[`${setting.camera}:guestfps`] ?? setting.guest_fps}${FPS_UNIT}`}</span>
                  </div>
                  <input
                    type="range"
                    min={FPS_MIN}
                    max={FPS_MAX}
                    value={draft[`${setting.camera}:guestfps`] ?? setting.guest_fps}
                    aria-label={`${GUEST_FPS_LABEL} · ${setting.camera}`}
                    className={SLIDER_CLASS}
                    onChange={(event) => setDraft((current) => ({ ...current, [`${setting.camera}:guestfps`]: Number(event.target.value) }))}
                    onPointerUp={(event) => commit(setting, 'guest_fps', Number(event.currentTarget.value), `${setting.camera}:guestfps`)}
                    onKeyUp={(event) => commit(setting, 'guest_fps', Number(event.currentTarget.value), `${setting.camera}:guestfps`)}
                  />
                </div>
              </div>
            </div>
          </Collapsible>
        )
      })}

      <Collapsible title={SECTION_GUEST} defaultOpen={false}>
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
        {guest?.guest_link ? (
          <div className={ROW_CLASS}>
            <GuestLink info={guest.guest_link} />
          </div>
        ) : null}
        <LanAccess />
      </Collapsible>

      <Collapsible title={SECTION_SUNSET} defaultOpen={false}>
        <SunsetLights />
      </Collapsible>

      <Collapsible title={SECTION_SERVOS} defaultOpen={false}>
        <ServosSettings />
      </Collapsible>
    </div>
  )
}

export default SettingsSection
