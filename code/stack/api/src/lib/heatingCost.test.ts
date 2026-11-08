import assert from 'node:assert/strict'
import { test } from 'node:test'
import { activationCost, isOffPeak } from './heatingCost.ts'
import { OFF_PEAK_PRICE_KWH, PEAK_PRICE_KWH } from './heatingSettings.ts'

// Le 9 novembre 2026, Paris est en UTC+1 (heure d'hiver) : 07:05 à Paris = 06:05 UTC.
const at = (iso: string): number => Date.parse(iso) / 1000
const round = (value: number): number => Math.round(value * 10000) / 10000

test('isOffPeak : une plage qui passe minuit, et une qui ne la passe pas', () => {
  assert.equal(isOffPeak(23 * 60 + 10, '23:10', '07:10'), true)
  assert.equal(isOffPeak(3 * 60, '23:10', '07:10'), true)
  assert.equal(isOffPeak(7 * 60 + 10, '23:10', '07:10'), false)
  assert.equal(isOffPeak(12 * 60, '23:10', '07:10'), false)
  assert.equal(isOffPeak(13 * 60, '13:00', '15:00'), true)
  assert.equal(isOffPeak(15 * 60, '13:00', '15:00'), false)
})

test('5 minutes à 2000 W en heures creuses : 0,0265 €', () => {
  assert.equal(activationCost({ at: at('2026-11-09T02:00:00Z'), minutes: 5 }), 0.0265)
})

test('une activation de 10 min à 07:05 (Paris) : 5 min creuses et 5 min pleines', () => {
  assert.equal(activationCost({ at: at('2026-11-09T06:05:00Z'), minutes: 10 }), round((2 / 60) * (5 * OFF_PEAK_PRICE_KWH + 5 * PEAK_PRICE_KWH)))
})

test('à 03:00 (Paris) tout est creux, à 12:00 tout est plein', () => {
  assert.equal(activationCost({ at: at('2026-11-09T02:00:00Z'), minutes: 6 }), round((2 / 60) * 6 * OFF_PEAK_PRICE_KWH))
  assert.equal(activationCost({ at: at('2026-11-09T11:00:00Z'), minutes: 6 }), round((2 / 60) * 6 * PEAK_PRICE_KWH))
})

test('l’heure d’été de Paris compte aussi (UTC+2)', () => {
  // 12:00 à Paris le 15 juillet = 10:00 UTC : plein
  assert.equal(activationCost({ at: at('2026-07-15T10:00:00Z'), minutes: 6 }), round((2 / 60) * 6 * PEAK_PRICE_KWH))
})
