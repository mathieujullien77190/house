// Tests des réglages par caméra et globaux.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { testContext } from './testing.ts'

const at = (iso: string): number => Date.parse(iso) / 1000

test('une caméra sans réglage : tout par défaut', () => {
  const { settings } = testContext()
  assert.deepEqual(settings.cameraSettings('cam'), {
    camera: 'cam',
    clips_mode: 'always',
    live_fps: 25,
    light_fps: 25,
    live_fps_mobile: 25,
    light_fps_mobile: 25,
    motion_sensitivity: 3,
    snapshot_seconds: 60,
    orientation: 'landscape',
  })
})

test('les réglages enregistrés, dont l\'orientation, sont relus', () => {
  const { settings } = testContext()
  settings.saveCameraSettings({ camera: 'cam', mode: 'night', fps: 10, light: 5, fpsMobile: 4, lightMobile: 3, sensitivity: 5, seconds: 120, orientation: 'portrait' })
  assert.deepEqual(settings.cameraSettings('cam'), {
    camera: 'cam',
    clips_mode: 'night',
    live_fps: 10,
    light_fps: 5,
    live_fps_mobile: 4,
    light_fps_mobile: 3,
    motion_sensitivity: 5,
    snapshot_seconds: 120,
    orientation: 'portrait',
  })
  settings.saveCameraSettings({ camera: 'cam', mode: 'off', fps: 10, light: 5, fpsMobile: 4, lightMobile: 3, sensitivity: 5, seconds: 120, orientation: 'landscape' })
  assert.equal(settings.cameraSettings('cam').clips_mode, 'off')
})

test('une ancienne base : clips_enabled à zéro veut dire jamais ; un mode inconnu retombe dessus', () => {
  const { settings, db } = testContext()
  db.exec("INSERT INTO settings (camera, clips_enabled, snapshot_seconds) VALUES ('ancienne', 0, 60), ('vieille', 1, 60)")
  assert.equal(settings.cameraSettings('ancienne').clips_mode, 'off')
  assert.equal(settings.cameraSettings('vieille').clips_mode, 'always')
  db.exec("INSERT INTO settings (camera, clips_enabled, clips_mode, snapshot_seconds, orientation) VALUES ('bizarre', 0, 'nimporte', 60, 'diagonale')")
  assert.equal(settings.cameraSettings('bizarre').clips_mode, 'off')
  assert.equal(settings.cameraSettings('bizarre').orientation, 'landscape')
})

test('keepsClip : toujours, jamais, ou seulement la nuit', () => {
  const { settings } = testContext()
  const update = (mode: string) => settings.saveCameraSettings({ camera: 'cam', mode, fps: 25, light: 25, fpsMobile: 25, lightMobile: 25, sensitivity: 3, seconds: 60, orientation: 'landscape' })
  assert.equal(settings.keepsClip('cam', at('2026-11-05T12:00:00Z')), true)
  update('off')
  assert.equal(settings.keepsClip('cam', at('2026-11-05T22:00:00Z')), false)
  update('night')
  assert.equal(settings.keepsClip('cam', at('2026-11-05T12:00:00Z')), false)
  assert.equal(settings.keepsClip('cam', at('2026-11-05T22:00:00Z')), true)
})

test('knownCameras : celles dont une image est connue, par ordre alphabétique', () => {
  const { settings, db } = testContext()
  assert.deepEqual(settings.knownCameras(), [])
  db.exec("INSERT INTO last_images VALUES ('b', 'u'), ('a', 'u')")
  assert.deepEqual(settings.knownCameras(), ['a', 'b'])
})

test('durée de garde : 15 jours, la variable, puis le réglage de la page ; une valeur absurde retombe sur 15', () => {
  const plain = testContext()
  assert.equal(plain.settings.clipRetentionDays(), 15)
  const withEnv = testContext(undefined, { CLIP_RETENTION_DAYS: '30' })
  assert.equal(withEnv.settings.clipRetentionDays(), 30)
  withEnv.settings.saveRetention(7)
  assert.equal(withEnv.settings.clipRetentionDays(), 7)
  withEnv.settings.saveRetention(9)
  assert.equal(withEnv.settings.clipRetentionDays(), 9)
  for (const bad of ['0', '3651', '2.5', 'abc']) assert.equal(testContext(undefined, { CLIP_RETENTION_DAYS: bad }).settings.clipRetentionDays(), 15)
})

test('cadence de la page invité : 2 par défaut, enregistrée, ou 2 si elle est absurde', () => {
  const { settings, db } = testContext()
  assert.equal(settings.guestFps(), 2)
  settings.saveGuestFps(10)
  assert.equal(settings.guestFps(), 10)
  settings.saveGuestFps(12)
  assert.equal(settings.guestFps(), 12)
  db.exec("UPDATE app_settings SET value = '99' WHERE key = 'guest_fps'")
  assert.equal(settings.guestFps(), 2)
  db.exec("UPDATE app_settings SET value = '0' WHERE key = 'guest_fps'")
  assert.equal(settings.guestFps(), 2)
})
