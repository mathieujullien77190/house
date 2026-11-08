import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { loadConfig } from './config.ts'
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
  assert.equal(config.plugMotionSensor, 'motion interieur')
  assert.equal(config.plugTemperatureSensor, 'motion interieur')
  assert.deepEqual(config.housePosition, { latitude: 48.6, longitude: 2.7 })
  assert.equal(config.recorderUrl, null)
  assert.equal(config.guest, null)
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
      PLUG_HOST: '192.168.1.200',
      PLUG_PORT: '1234',
      PLUG_MAC: 'AA:BB',
      RECORDER_URL: 'http://motion:8080//',
      GUEST_KEY: 'g',
      GUEST_PORT: '8091',
      GUEST_PUBLIC_URL: 'https://x',
      TLS_CERT: cert,
      TLS_KEY: key,
      CA_CERT: 'ca.pem',
    })
    assert.equal(config.port, 9000)
    assert.equal(config.webDir, resolve('w'))
    assert.deepEqual(config.go2rtcUrls, ['http://a:1984', 'http://b:1984'])
    assert.deepEqual(config.switchPoe, { url: 'http://sw', user: 'root', password: 'pw', ports: { cam1: 3, cam2: 4 } })
    assert.deepEqual(config.hue, { url: 'http://1.2.3.4', key: 'abc' })
    assert.equal(config.plugMotionSensor, 'autre')
    // sans PLUG_TEMPERATURE_SENSOR, le détecteur du mouvement donne aussi la température
    assert.equal(config.plugTemperatureSensor, 'autre')
    assert.equal(loadConfig({ API_KEY: '12345678', PLUG_MOTION_SENSOR: 'a', PLUG_TEMPERATURE_SENSOR: 'b', HOUSE_LATITUDE: '10', HOUSE_LONGITUDE: '20' }).plugTemperatureSensor, 'b')
    assert.deepEqual(loadConfig({ API_KEY: '12345678', HOUSE_LATITUDE: '10', HOUSE_LONGITUDE: '20' }).housePosition, { latitude: 10, longitude: 20 })
    assert.deepEqual(config.plug, { host: '192.168.1.200', port: 1234, mac: 'AA:BB' })
    assert.equal(config.recorderUrl, 'http://motion:8080')
    assert.deepEqual(config.guest, { key: 'g', port: 8091, url: 'https://x' })
    assert.deepEqual(config.tls, { cert, key })
    assert.equal(config.caCert, 'ca.pem')
  })
})

test('GO2RTC_URL, le switch par défaut, la prise et la page invité par défaut, un certificat absent', () => {
  const config = loadConfig({
    API_KEY: '12345678',
    GO2RTC_URL: 'http://solo:1984',
    SWITCH_PASSWORD: 'pw',
    PLUG_HOST: 'h',
    GUEST_KEY: 'g',
    TLS_CERT: '/inexistant/c.pem',
    TLS_KEY: '/inexistant/k.pem',
  })
  assert.deepEqual(config.go2rtcUrls, ['http://solo:1984'])
  assert.deepEqual(config.switchPoe, { url: 'http://192.168.1.33', user: 'admin', password: 'pw', ports: {} })
  assert.deepEqual(config.plug, { host: 'h', port: 9999, mac: '' })
  assert.deepEqual(config.guest, { key: 'g', port: 8090, url: '' })
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
