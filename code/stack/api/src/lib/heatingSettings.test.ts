import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createHeatingSettings, DEFAULT_SETTINGS, mergeSettings } from './heatingSettings.ts'

test('les valeurs par défaut : 3 °C, 5 min, 20 min, 0,1589 / 0,2142 €, 23:10 → 07:10, 2000 W', () => {
  assert.deepEqual(DEFAULT_SETTINGS, {
    enabled: true,
    thresholdC: 3,
    minutes: 5,
    cooldownMinutes: 20,
    priceKwh: 0.1589,
    peakPriceKwh: 0.2142,
    offPeakStart: '23:10',
    offPeakEnd: '07:10',
    heaterWatts: 2000,
  })
})

test('mergeSettings : une valeur absente garde l’ancienne, tout est accepté dans les bornes', () => {
  assert.deepEqual(mergeSettings({}, DEFAULT_SETTINGS), DEFAULT_SETTINGS)
  const next = mergeSettings(
    { enabled: false, thresholdC: -30, minutes: 10, cooldownMinutes: 10, priceKwh: 0, peakPriceKwh: 5, offPeakStart: null, offPeakEnd: '06:30', heaterWatts: null },
    DEFAULT_SETTINGS,
  )
  assert.deepEqual(next, { enabled: false, thresholdC: -30, minutes: 10, cooldownMinutes: 10, priceKwh: 0, peakPriceKwh: 5, offPeakStart: null, offPeakEnd: '06:30', heaterWatts: null })
  assert.deepEqual(mergeSettings({ minutes: 120, cooldownMinutes: 1440, thresholdC: 30, heaterWatts: 5000 }, DEFAULT_SETTINGS), {
    ...DEFAULT_SETTINGS,
    minutes: 120,
    cooldownMinutes: 1440,
    thresholdC: 30,
    heaterWatts: 5000,
  })
})

test('mergeSettings : refuse les valeurs hors bornes ou mal typées', () => {
  const bad: unknown[] = [
    null,
    [],
    'x',
    { enabled: 'oui' },
    { thresholdC: 31 },
    { thresholdC: -31 },
    { thresholdC: '3' },
    { thresholdC: Infinity },
    { minutes: 0 },
    { minutes: 121 },
    { minutes: 2.5 },
    { minutes: '5' },
    { cooldownMinutes: 1441 },
    { cooldownMinutes: 20.5 },
    { cooldownMinutes: '20' },
    { minutes: 30 },
    { cooldownMinutes: 4 },
    { priceKwh: -1 },
    { priceKwh: 6 },
    { peakPriceKwh: '1' },
    { offPeakStart: '24:00' },
    { offPeakEnd: '7:10' },
    { offPeakStart: 1 },
    { heaterWatts: 0 },
    { heaterWatts: 5001 },
    { heaterWatts: 1.5 },
    { heaterWatts: '2000' },
  ]
  for (const body of bad) assert.equal(typeof mergeSettings(body, DEFAULT_SETTINGS), 'string', JSON.stringify(body))
})

test('le fichier : écriture atomique, relecture, défauts si absent ou abîmé', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'sous', 'heating.json')
    const store = createHeatingSettings(file)
    assert.deepEqual(store.get(), DEFAULT_SETTINGS)
    store.set({ ...DEFAULT_SETTINGS, thresholdC: 1 })
    assert.equal(store.get().thresholdC, 1)
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).thresholdC, 1)
    writeFileSync(file, '{"minutes": 500}')
    assert.deepEqual(store.get(), DEFAULT_SETTINGS)
    writeFileSync(file, 'pas du json')
    assert.deepEqual(store.get(), DEFAULT_SETTINGS)
  })
})
