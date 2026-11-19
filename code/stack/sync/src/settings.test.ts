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
    motion_min_seconds: 1,
    snapshot_seconds: 60,
    orientation: 'landscape',
    rain_mode: 'off',
    rain_now: 'off',
    wind_mode: 'off',
    eyes_mode: 'off',
    clip_retention_days: 15,
    guest_fps: 2,
    foliage_zones: 0,
  })
})

test('les réglages enregistrés, dont l\'orientation, sont relus', () => {
  const { settings } = testContext()
  settings.saveCameraSettings({ camera: 'cam', mode: 'night', fps: 10, light: 5, fpsMobile: 4, lightMobile: 3, sensitivity: 5, minSeconds: 7, seconds: 120, orientation: 'portrait' })
  assert.deepEqual(settings.cameraSettings('cam'), {
    camera: 'cam',
    clips_mode: 'night',
    live_fps: 10,
    light_fps: 5,
    live_fps_mobile: 4,
    light_fps_mobile: 3,
    motion_sensitivity: 5,
    motion_min_seconds: 7,
    snapshot_seconds: 120,
    orientation: 'portrait',
    rain_mode: 'off',
    rain_now: 'off',
    wind_mode: 'off',
    eyes_mode: 'off',
    clip_retention_days: 15,
    guest_fps: 2,
    foliage_zones: 0,
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

test('knownCameras : les caméras connues dans leur ordre d’arrivée, les autres après', () => {
  const { settings, db } = testContext()
  db.exec("INSERT INTO last_images VALUES ('zebre', 'u'), ('voliere-toit', 'u'), ('abeille', 'u'), ('voliere-interieur', 'u'), ('salon-de-jardin', 'u'), ('voliere-exterieur', 'u')")
  assert.deepEqual(settings.knownCameras(), ['voliere-interieur', 'voliere-exterieur', 'salon-de-jardin', 'voliere-toit', 'abeille', 'zebre'])
})

test('durée de garde : 15 jours, la variable, puis le réglage de la page ; une valeur absurde retombe sur 15', () => {
  const plain = testContext()
  assert.equal(plain.settings.clipRetentionDays(), 15)
  const withEnv = testContext(undefined, { CLIP_RETENTION_DAYS: '30' })
  assert.equal(withEnv.settings.clipRetentionDays(), 30)
  withEnv.db.prepare("INSERT INTO app_settings (key, value) VALUES ('clip_retention_days', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run('7')
  assert.equal(withEnv.settings.clipRetentionDays(), 7)
  withEnv.db.prepare("INSERT INTO app_settings (key, value) VALUES ('clip_retention_days', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run('9')
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

test('mode pluie : allumé, il suit la météo (pas de clips, une image toutes les 5 s) ; les anciens modes valent « on »', () => {
  const { settings, db } = testContext()
  const save = (camera: string, rain?: string) => settings.saveCameraSettings({ camera, mode: 'always', fps: 25, light: 25, fpsMobile: 25, lightMobile: 25, sensitivity: 3, seconds: 60, orientation: 'landscape', rain })
  const now = (camera: string) => db.prepare('SELECT rain_now FROM settings WHERE camera = ?').get(camera)?.rain_now
  save('cam')
  save('autre', 'on')
  assert.deepEqual([settings.cameraSettings('cam').rain_mode, settings.cameraSettings('autre').rain_mode], ['off', 'on'])
  // allumé mais sans pluie : rien ne change
  assert.equal(settings.effectiveSettings('autre').snapshot_seconds, 60)
  assert.equal(settings.effectiveSettings('autre').clips_mode, 'always')
  settings.setWeatherRain('rain')
  assert.deepEqual([now('cam'), now('autre')], ['off', 'rain'])
  assert.equal(settings.cameraSettings('autre').rain_now, 'rain')
  // les réglages gardés ne bougent pas, les réglages qui comptent oui
  assert.deepEqual([settings.cameraSettings('autre').clips_mode, settings.cameraSettings('autre').snapshot_seconds], ['always', 60])
  assert.deepEqual([settings.effectiveSettings('autre').clips_mode, settings.effectiveSettings('autre').snapshot_seconds], ['off', 5])
  assert.deepEqual(settings.effectiveSettings('cam'), settings.cameraSettings('cam'))
  assert.equal(settings.keepsClip('autre', at('2026-11-05T12:00:00Z')), false)
  assert.equal(settings.keepsClip('cam', at('2026-11-05T12:00:00Z')), true)
  settings.setWeatherRain('heavy')
  assert.equal(now('autre'), 'heavy')
  // éteindre le mode range tout de suite le niveau
  save('autre', 'off')
  assert.deepEqual([now('autre'), settings.cameraSettings('autre').rain_mode], ['off', 'off'])
  save('autre')
  assert.equal(settings.cameraSettings('autre').rain_mode, 'off')
  for (const old of ['on', 'auto', 'rain', 'heavy']) {
    db.exec(`UPDATE settings SET rain_mode = '${old}' WHERE camera = 'autre'`)
    assert.equal(settings.cameraSettings('autre').rain_mode, 'on', old)
  }
  db.exec("UPDATE settings SET rain_mode = 'nimporte' WHERE camera = 'autre'")
  assert.equal(settings.cameraSettings('autre').rain_mode, 'off')
  // la pluie s'arrête
  db.exec("UPDATE settings SET rain_mode = 'on' WHERE camera = 'autre'")
  settings.setWeatherRain('none')
  assert.deepEqual([now('autre'), settings.cameraSettings('autre').rain_now], ['off', 'off'])
})

test('mode vent : allumé, il suit le vent de la météo au-delà du seuil ; la pluie l’emporte sur lui', () => {
  const { settings, db } = testContext()
  const save = (camera: string, wind?: string, rain?: string) => settings.saveCameraSettings({ camera, mode: 'always', fps: 25, light: 25, fpsMobile: 25, lightMobile: 25, sensitivity: 3, seconds: 60, orientation: 'landscape', wind, rain })
  const now = (camera: string) => db.prepare('SELECT rain_now FROM settings WHERE camera = ?').get(camera)?.rain_now
  save('calme')
  save('venteuse', 'on')
  save('mouillee', 'on', 'on')
  assert.deepEqual([settings.cameraSettings('venteuse').wind_mode, settings.cameraSettings('calme').wind_mode], ['on', 'off'])
  settings.setWeatherWind(19)
  assert.equal(now('venteuse'), 'off')
  settings.setWeatherWind(20)
  assert.deepEqual([now('calme'), now('venteuse'), now('mouillee')], ['off', 'wind', 'wind'])
  // un niveau « wind » agit comme la pluie : pas de clips, une image toutes les 5 s
  assert.deepEqual([settings.effectiveSettings('venteuse').clips_mode, settings.effectiveSettings('venteuse').snapshot_seconds], ['off', 5])
  settings.setWeatherRain('rain')
  assert.deepEqual([now('venteuse'), now('mouillee')], ['wind', 'rain'])
  settings.setWeatherRain('none')
  settings.setWeatherWind(0)
  assert.equal(now('venteuse'), 'off')
})

test('recherche des yeux : réglage de la caméra, éteint par défaut ; la nuit rétrécie ; l’état est rangé pour l’API', () => {
  const { settings, db } = testContext()
  const save = (eyes?: string) => settings.saveCameraSettings({ camera: 'cam', mode: 'always', fps: 25, light: 25, fpsMobile: 25, lightMobile: 25, sensitivity: 3, seconds: 60, orientation: 'landscape', eyes })
  const eyesNow = () => db.prepare('SELECT eyes_now FROM settings WHERE camera = ?').get('cam')?.eyes_now
  assert.equal(settings.eyesDetectionEnabled('cam'), false)
  save('on')
  assert.deepEqual([settings.cameraSettings('cam').eyes_mode, settings.eyesDetectionEnabled('cam')], ['on', true])
  save('nimporte')
  assert.equal(settings.cameraSettings('cam').eyes_mode, 'off')
  settings.saveEyesNow('cam', true)
  assert.equal(eyesNow(), 1)
  settings.saveEyesNow('cam', false)
  assert.equal(eyesNow(), 0)
  assert.equal(settings.eyesNight(at('2026-11-05T22:00:00Z')), true)
  assert.equal(settings.eyesNight(at('2026-11-05T12:00:00Z')), false)
})

test('réglages propres à la caméra : durée de garde, images par seconde invité, feuillage ; sinon la valeur de départ', () => {
  const { settings, db } = testContext()
  const save = (extra: object) => settings.saveCameraSettings({ camera: 'cam', mode: 'always', fps: 25, light: 25, fpsMobile: 25, lightMobile: 25, sensitivity: 3, seconds: 60, orientation: 'landscape', ...extra })
  save({ retention: 30, guestFps: 6, foliage: 12 })
  assert.deepEqual([settings.cameraSettings('cam').clip_retention_days, settings.cameraSettings('cam').guest_fps, settings.cameraSettings('cam').foliage_zones], [30, 6, 12])
  // la valeur de départ sert aux caméras sans la leur, et aux valeurs absurdes
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('clip_retention_days', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run('9')
  settings.saveGuestFps(4)
  db.exec("INSERT INTO settings (camera, clips_enabled, snapshot_seconds) VALUES ('neuve', 1, 60)")
  assert.deepEqual([settings.cameraSettings('neuve').clip_retention_days, settings.cameraSettings('neuve').guest_fps, settings.cameraSettings('neuve').foliage_zones], [9, 4, 0])
  for (const [retention, guestFps, foliage] of [[0, 0, 0], [3651, 26, 61], [-1, -1, -1]]) {
    db.exec(`UPDATE settings SET retention_days = ${retention}, guest_fps = ${guestFps}, foliage_zones = ${foliage} WHERE camera = 'cam'`)
    assert.deepEqual([settings.cameraSettings('cam').clip_retention_days, settings.cameraSettings('cam').guest_fps, settings.cameraSettings('cam').foliage_zones], [9, 4, 0])
  }
  save({ foliage: 0 })
  assert.equal(settings.cameraSettings('cam').foliage_zones, 0)
})

test('allumage au coucher du soleil : allumé tant qu’on ne l’a pas coupé ; le dernier jour est gardé', () => {
  const { settings } = testContext()
  assert.equal(settings.sunsetLightsEnabled(), true)
  settings.saveSunsetLightsEnabled(false)
  assert.equal(settings.sunsetLightsEnabled(), false)
  settings.saveSunsetLightsEnabled(true)
  assert.equal(settings.sunsetLightsEnabled(), true)
  assert.equal(settings.sunsetLightsLastDay(), null)
  settings.saveSunsetLightsLastDay('2026-11-18')
  assert.equal(settings.sunsetLightsLastDay(), '2026-11-18')
})
