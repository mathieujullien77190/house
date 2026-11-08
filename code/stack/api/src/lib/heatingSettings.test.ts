import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createHeatingSettings, DEFAULT_SETTINGS, HEATER_WATTS, mergeSettings, OFF_PEAK_END, OFF_PEAK_PRICE_KWH, OFF_PEAK_START, PEAK_PRICE_KWH } from './heatingSettings.ts'

test('les valeurs par défaut : 3 °C, 5 min, 20 min ; prix, heures creuses et puissance sont des constantes', () => {
  assert.equal(OFF_PEAK_PRICE_KWH, 0.1589)
  assert.equal(PEAK_PRICE_KWH, 0.2142)
  assert.equal(OFF_PEAK_START, '23:10')
  assert.equal(OFF_PEAK_END, '07:10')
  assert.equal(HEATER_WATTS, 2000)
  assert.deepEqual(DEFAULT_SETTINGS, {
    enabled: true,
    thresholdC: 3,
    minutes: 5,
    cooldownMinutes: 20,
  })
})

test('mergeSettings : une valeur absente garde l’ancienne, tout est accepté dans les bornes', () => {
  assert.deepEqual(mergeSettings({}, DEFAULT_SETTINGS), DEFAULT_SETTINGS)
  const next = mergeSettings(
    { enabled: false, thresholdC: -30, minutes: 10, cooldownMinutes: 10 },
    DEFAULT_SETTINGS,
  )
  assert.deepEqual(next, { enabled: false, thresholdC: -30, minutes: 10, cooldownMinutes: 10 })
  assert.deepEqual(mergeSettings({ minutes: 120, cooldownMinutes: 1440, thresholdC: 30 }, DEFAULT_SETTINGS), {
    ...DEFAULT_SETTINGS,
    minutes: 120,
    cooldownMinutes: 1440,
    thresholdC: 30,
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
  ]
  for (const body of bad) assert.equal(typeof mergeSettings(body, DEFAULT_SETTINGS), 'string', JSON.stringify(body))
})

test('mergeSettings : un prix, une heure ou une puissance envoyé est ignoré (constantes)', () => {
  assert.deepEqual(mergeSettings({ priceKwh: 1, peakPriceKwh: 2, offPeakStart: '01:00', offPeakEnd: '02:00', heaterWatts: 1 }, DEFAULT_SETTINGS), DEFAULT_SETTINGS)
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

test('disable : la règle est désactivée, les autres réglages restent', async () => {
  await withTempDir((dir) => {
    const store = createHeatingSettings(join(dir, 'heating.json'))
    store.set({ ...DEFAULT_SETTINGS, thresholdC: 1 })
    store.disable()
    assert.deepEqual(store.get(), { ...DEFAULT_SETTINGS, thresholdC: 1, enabled: false })
  })
})
