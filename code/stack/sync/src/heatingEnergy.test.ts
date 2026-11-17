import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HEATER_WATTS, readHeatingEnergy } from './heatingEnergy.ts'
import { createHeatingLogTable } from './heatingLog.ts'
import { testContext } from './testing.ts'

test('sans activation, tout est vide', () => {
  const ctx = testContext()
  createHeatingLogTable(ctx.db)
  assert.deepEqual(readHeatingEnergy(ctx.db, 1000), { since: null, kwh: 0, cost: 0, watts: 0 })
})

test('somme les minutes allumées en kWh et les coûts, et dit si une activation est en cours', () => {
  const ctx = testContext()
  createHeatingLogTable(ctx.db)
  ctx.db.exec("INSERT INTO heating_log (started_at, origin, minutes, cost) VALUES (1000, 'auto', 30, 0.1), (5000, 'manuel', 90, NULL)")
  const done = readHeatingEnergy(ctx.db, 20000)
  assert.equal(done.since, new Date(1000 * 1000).toISOString())
  assert.equal(done.kwh, (120 / 60) * (HEATER_WATTS / 1000))
  assert.equal(done.cost, 0.1)
  assert.equal(done.watts, 0)
  assert.equal(readHeatingEnergy(ctx.db, 5100).watts, HEATER_WATTS)
})
