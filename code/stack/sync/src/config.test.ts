// Tests de la configuration lue dans l'environnement.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { loadConfig } from './config.ts'

test('sans variable : les valeurs par défaut du compose', () => {
  const config = loadConfig({})
  assert.deepEqual(config.recorders, ['http://motion:8080'])
  assert.equal(config.houseKey, '')
  assert.equal(config.pagePort, 8081)
  assert.equal(config.webDir, resolve('./web'))
  assert.equal(config.dataDir, './data')
  assert.equal(config.intervalMs, 30_000)
  assert.equal(config.snapshotIntervalSeconds, 60)
  assert.equal(config.snapshotRetentionDays, 7)
  assert.deepEqual(config.housePosition, { latitude: 48.6, longitude: 2.7 })
  assert.equal(config.go2rtcUrl, 'http://go2rtc:1984')
  assert.equal(config.retentionDaysEnv, undefined)
  assert.equal(config.guestVisitsDays, 365)
  assert.equal(config.hueLogDays, 365)
  assert.equal(config.apiServername, 'localhost')
  assert.equal(config.zonesFile, '/house/zones.json')
})

test('RECORDER_URLS : plusieurs enregistreurs, espaces et « / » final retirés, vides ignorés', () => {
  assert.deepEqual(loadConfig({ RECORDER_URLS: ' http://a:1/ , ,http://b:2 ' }).recorders, ['http://a:1', 'http://b:2'])
})

test('RECORDER_URL sert pour un seul enregistreur, RECORDER_URLS passe devant', () => {
  assert.deepEqual(loadConfig({ RECORDER_URL: 'http://seul:1/' }).recorders, ['http://seul:1'])
  assert.deepEqual(loadConfig({ RECORDER_URL: 'http://seul:1', RECORDER_URLS: 'http://liste:2' }).recorders, ['http://liste:2'])
})

test('les réglages de l\'environnement sont repris', () => {
  const config = loadConfig({
    HOUSE_KEY: 'k',
    PAGE_PORT: '9000',
    POLL_INTERVAL_SECONDS: '5',
    HOUSE_LATITUDE: '10',
    HOUSE_LONGITUDE: '20',
    GO2RTC_URL: 'http://g:1/',
    CLIP_RETENTION_DAYS: '30',
    HUE_BRIDGE_IP: '1.2.3.4',
    HUE_APP_KEY: 'app',
    HUE_LOG_DAYS: '10',
    GUEST_VISITS_DAYS: '5',
    DATA_DIR: '/d',
  })
  assert.deepEqual([config.houseKey, config.pagePort, config.intervalMs], ['k', 9000, 5000])
  assert.deepEqual(config.housePosition, { latitude: 10, longitude: 20 })
  assert.equal(config.go2rtcUrl, 'http://g:1')
  assert.deepEqual([config.retentionDaysEnv, config.hueAddress, config.hueKey, config.hueLogDays, config.guestVisitsDays, config.dataDir], ['30', '1.2.3.4', 'app', 10, 5, '/d'])
})
