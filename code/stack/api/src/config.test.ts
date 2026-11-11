import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { loadConfig, parseAcUnits, parseShutters } from './config.ts'
import { withTempDir } from './testing/helpers.ts'

test('sans clé ou avec une clé trop courte, la configuration est refusée', () => {
  assert.throws(() => loadConfig({}), /API_KEY/)
  assert.throws(() => loadConfig({ API_KEY: '1234567' }), /API_KEY/)
})

test('les valeurs par défaut', () => {
  const config = loadConfig({ API_KEY: '12345678' })
  assert.equal(config.port, 8080)
  assert.equal(config.webDir, resolve('./web'))
  assert.equal(config.dataDir, resolve('./data'))
  assert.equal(config.stateDir, resolve('./state'))
  assert.deepEqual(config.go2rtcUrls, ['http://go2rtc:1984'])
  assert.equal(config.switchPoe, null)
  assert.equal(config.hue, null)
  assert.equal(config.plug, null)
  assert.deepEqual(
    config.shutters.map((shutter) => shutter.id),
    ['1', '2', '3', '4'],
  )
  // par défaut, tous les volets ont l'action automatique ; sans ESP32, c'est la simulation
  assert.deepEqual(config.shuttersAuto, ['1', '2', '3', '4'])
  assert.equal(config.shuttersEspUrl, null)
  assert.equal(config.plugMotionSensor, 'motion interieur')
  assert.equal(config.plugTemperatureSensor, 'motion interieur')
  assert.deepEqual(config.housePosition, { latitude: 48.52, longitude: 2.64 })
  assert.equal(config.recorderUrl, null)
  assert.equal(config.tls, null)
  assert.equal(config.caCert, '')
})

test('toutes les variables renseignées', async () => {
  await withTempDir((dir) => {
    const cert = join(dir, 'c.pem')
    const key = join(dir, 'k.pem')
    writeFileSync(cert, 'c')
    writeFileSync(key, 'k')
    const config = loadConfig({
      API_KEY: '12345678',
      PORT: '9000',
      WEB_DIR: 'w',
      DATA_DIR: 'd',
      STATE_DIR: 's',
      GO2RTC_URLS: 'http://a:1984/, http://b:1984,,',
      SWITCH_PASSWORD: 'pw',
      SWITCH_URL: 'http://sw',
      SWITCH_USER: 'root',
      SWITCH_PORTS: 'cam1:3, cam2 : 4,bad:9,sans-port,:5,x:0',
      HUE_BRIDGE_IP: '1.2.3.4',
      HUE_APP_KEY: 'abc',
      PLUG_MOTION_SENSOR: 'autre',
      SHUTTERS: '5:Cave, 6 : Grenier ,mal',
      SHUTTERS_AUTO: ' 6, ,5',
      SHUTTERS_ESP_URL: 'http://esp//',
      PLUG_HOST: '192.168.1.200',
      PLUG_PORT: '1234',
      PLUG_MAC: 'AA:BB',
      RECORDER_URL: 'http://motion:8080//',
      TLS_CERT: cert,
      TLS_KEY: key,
      CA_CERT: 'ca.pem',
    })
    assert.equal(config.port, 9000)
    assert.equal(config.webDir, resolve('w'))
    assert.deepEqual(config.go2rtcUrls, ['http://a:1984', 'http://b:1984'])
    assert.deepEqual(config.switchPoe, { url: 'http://sw', user: 'root', password: 'pw', ports: { cam1: 3, cam2: 4 } })
    assert.deepEqual(config.hue, { url: 'http://1.2.3.4', key: 'abc' })
    assert.deepEqual(config.shutters, [
      { id: '5', name: 'Cave', shadeId: 5 },
      { id: '6', name: 'Grenier', shadeId: 6 },
    ])
    // le temps de fermeture est facultatif ; zéro ne compte pas
    assert.deepEqual(parseShutters('1:Cuisine:19,2:Salon:0,3:Porte'), [
      { id: '1', name: 'Cuisine', shadeId: 1, closeSeconds: 19 },
      { id: '2', name: 'Salon', shadeId: 2 },
      { id: '3', name: 'Porte', shadeId: 3 },
    ])
    assert.deepEqual(config.shuttersAuto, ['6', '5'])
    assert.equal(config.shuttersEspUrl, 'http://esp')
    // SHUTTERS_AUTO absent : tous les volets configurés
    assert.deepEqual(loadConfig({ API_KEY: '12345678', SHUTTERS: '7:A,8:B' }).shuttersAuto, ['7', '8'])
    assert.equal(config.plugMotionSensor, 'autre')
    // sans PLUG_TEMPERATURE_SENSOR, le détecteur du mouvement donne aussi la température
    assert.equal(config.plugTemperatureSensor, 'autre')
    assert.equal(loadConfig({ API_KEY: '12345678', PLUG_MOTION_SENSOR: 'a', PLUG_TEMPERATURE_SENSOR: 'b', HOUSE_LATITUDE: '10', HOUSE_LONGITUDE: '20' }).plugTemperatureSensor, 'b')
    assert.deepEqual(loadConfig({ API_KEY: '12345678', HOUSE_LATITUDE: '10', HOUSE_LONGITUDE: '20' }).housePosition, { latitude: 10, longitude: 20 })
    assert.deepEqual(config.plug, { host: '192.168.1.200', port: 1234, mac: 'AA:BB' })
    assert.equal(config.recorderUrl, 'http://motion:8080')
    assert.deepEqual(config.tls, { cert, key })
    assert.equal(config.caCert, 'ca.pem')
  })
})

test('GO2RTC_URL, le switch par défaut, la prise par défaut, un certificat absent', () => {
  const config = loadConfig({
    API_KEY: '12345678',
    GO2RTC_URL: 'http://solo:1984',
    SWITCH_PASSWORD: 'pw',
    PLUG_HOST: 'h',
    TLS_CERT: '/inexistant/c.pem',
    TLS_KEY: '/inexistant/k.pem',
  })
  assert.deepEqual(config.go2rtcUrls, ['http://solo:1984'])
  assert.deepEqual(config.switchPoe, { url: 'http://192.168.1.33', user: 'admin', password: 'pw', ports: {} })
  assert.deepEqual(config.plug, { host: 'h', port: 9999, mac: '' })
  assert.equal(config.tls, null)
})

test('un certificat sans sa clé ne suffit pas', () => {
  assert.equal(loadConfig({ API_KEY: '12345678', TLS_CERT: 'seul.pem' }).tls, null)
})

test('par défaut, l’environnement du processus est lu', () => {
  const before = process.env.API_KEY
  process.env.API_KEY = 'processus-key'
  try {
    assert.equal(loadConfig().apiKey, 'processus-key')
  } finally {
    if (before === undefined) delete process.env.API_KEY
    else process.env.API_KEY = before
  }
})

test('parseShutters : numéro:nom, une entrée mal écrite est ignorée', () => {
  assert.deepEqual(parseShutters('1:Salon, 2 : Chambre ,x:Non,3:'), [
    { id: '1', name: 'Salon', shadeId: 1 },
    { id: '2', name: 'Chambre', shadeId: 2 },
  ])
  assert.deepEqual(parseShutters(''), [])
})

test('parseAcUnits : id:nom:adresse, une entrée mal écrite est ignorée', () => {
  assert.deepEqual(parseAcUnits('salon:Salon:192.168.1.130, chambre : Chambre invité : 192.168.1.6 ,x:Non:nom,y:Pas'), [
    { id: 'salon', name: 'Salon', host: '192.168.1.130' },
    { id: 'chambre', name: 'Chambre invité', host: '192.168.1.6' },
  ])
  assert.deepEqual(parseAcUnits(''), [])
  assert.deepEqual(loadConfig({ API_KEY: '12345678', AC_UNITS: 'a:A:1.2.3.4' }).acUnits, [{ id: 'a', name: 'A', host: '1.2.3.4' }])
})
