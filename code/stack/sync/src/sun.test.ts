// Tests du lever et du coucher du soleil : node --test (npm test).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isNight, sunTimes } from './sun.ts'

const PARIS = { latitude: 48.6, longitude: 2.7 }
const at = (iso: string): number => Date.parse(iso) / 1000

test('en novembre près de Paris, le soleil se lève vers 6 h 45 UTC et se couche vers 16 h 25 UTC (7 h 45 et 17 h 25 à Paris)', () => {
  const times = sunTimes(at('2026-11-05T12:00:00Z'), PARIS)
  assert.ok(times)
  const hours = (t: number) => (t % 86400) / 3600
  assert.ok(Math.abs(hours(times.rise) - 6.7) < 0.4, `lever ${hours(times.rise)}`)
  assert.ok(Math.abs(hours(times.set) - 16.4) < 0.4, `coucher ${hours(times.set)}`)
})

test('la nuit élargie va de 30 min avant le coucher à 30 min après le lever', () => {
  const margin = 1800
  assert.equal(isNight(at('2026-11-05T12:00:00Z'), PARIS, margin), false)
  assert.equal(isNight(at('2026-11-05T22:00:00Z'), PARIS, margin), true)
  assert.equal(isNight(at('2026-11-06T03:00:00Z'), PARIS, margin), true)
  assert.equal(isNight(at('2026-11-06T09:00:00Z'), PARIS, margin), false)
})
