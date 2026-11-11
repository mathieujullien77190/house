import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMachineEnergy, readMachineEnergy, type CpuReader } from './machineEnergy.ts'
import { OFF_PEAK_PRICE_KWH, PEAK_PRICE_KWH } from './cameraEnergy.ts'
import { testContext } from './testing.ts'

const at = (iso: string) => Date.parse(iso)

/** Un échantillonneur dont le processeur répond ce que `answer.current` dit (des watts, null ou une erreur). */
const setup = (start: string) => {
  const ctx = testContext()
  ctx.time.set(at(start))
  const answer: { current: number | null | Error } = { current: null }
  const readCpu: CpuReader = async () => {
    if (answer.current instanceof Error) throw answer.current
    return answer.current === null ? null : { watts: answer.current, ageSeconds: 1 }
  }
  const energy = createMachineEnergy(ctx, readCpu)
  const rows = () => ctx.db.prepare('SELECT device, hour, wh_offpeak, wh_peak, cost FROM machine_energy ORDER BY hour').all() as Record<string, unknown>[]
  return { ctx, answer, energy, rows }
}
const near = (actual: unknown, expected: number) => assert.ok(Math.abs(Number(actual) - expected) < 1e-9, `${String(actual)} différent de ${expected}`)

test('sans relevé, les totaux sont vides', () => {
  const { ctx } = setup('2026-11-09T02:00:00Z')
  assert.deepEqual(readMachineEnergy(ctx.db), { since: null, kwh: 0, cost: 0 })
})

test('un relevé normal en heures creuses : le premier pose la date de départ, le suivant compte la dernière puissance connue', async () => {
  const { ctx, answer, energy, rows } = setup('2026-11-09T02:00:00Z')
  answer.current = 6
  assert.equal(await energy.sample(), true)
  assert.equal(readMachineEnergy(ctx.db).since, '2026-11-09T02:00:00.000Z')
  assert.deepEqual(rows(), [])
  ctx.time.advance(60_000)
  answer.current = 60
  await energy.sample()
  const [row] = rows()
  assert.equal(row.device, 'mini-pc')
  assert.equal(row.hour, '2026-11-09T02:00:00.000Z')
  near(row.wh_offpeak, 0.1)
  assert.equal(row.wh_peak, 0)
  near(row.cost, (0.1 * OFF_PEAK_PRICE_KWH) / 1000)
  ctx.time.advance(60_000)
  await energy.sample()
  near(rows()[0].wh_offpeak, 0.1 + 1)
  const totals = readMachineEnergy(ctx.db)
  near(totals.kwh, 1.1 / 1000)
  near(totals.cost, (1.1 * OFF_PEAK_PRICE_KWH) / 1000)
})

test('un relevé à cheval sur 23:10 (Paris) se partage entre heures pleines et creuses, aux prix constants', async () => {
  const { ctx, answer, energy, rows } = setup('2026-11-09T22:08:00Z')
  answer.current = 60
  await energy.sample()
  ctx.time.advance(4 * 60_000)
  await energy.sample()
  const [row] = rows()
  near(row.wh_peak, 2)
  near(row.wh_offpeak, 2)
  near(row.cost, (2 * PEAK_PRICE_KWH + 2 * OFF_PEAK_PRICE_KWH) / 1000)
})

test('un trou de plus de 5 minutes est plafonné ; une mesure absente ou en erreur ne compte rien', async () => {
  const { ctx, answer, energy, rows } = setup('2026-11-09T02:00:00Z')
  answer.current = 12
  await energy.sample()
  ctx.time.advance(2 * 60_000)
  answer.current = null
  assert.equal(await energy.sample(), false)
  answer.current = new Error('lecture impossible')
  assert.equal(await energy.sample(), false)
  assert.deepEqual(rows(), [])
  assert.ok(ctx.logs.some((line) => line.includes('Énergie du mini PC : relevé sauté (lecture impossible)')))
  ctx.time.advance(60 * 60_000)
  answer.current = 0
  await energy.sample()
  near(rows()[0].wh_offpeak, 1)
})

test('le lecteur par défaut lit le fichier de puissance de la configuration', async () => {
  const { ctx } = setup('2026-11-09T02:00:00Z')
  ctx.config.powerFile = '/introuvable/cpu.json'
  assert.equal(await createMachineEnergy(ctx).sample(), false)
})

test('la date de départ survit à un redémarrage ; une base qui échoue est notée sans tout casser', async () => {
  const { ctx, answer, energy } = setup('2026-11-09T02:00:00Z')
  answer.current = 5
  await energy.sample()
  ctx.time.advance(60_000)
  const again = createMachineEnergy(ctx, async () => ({ watts: 5, ageSeconds: 0 }))
  await again.sample()
  assert.equal(readMachineEnergy(ctx.db).since, '2026-11-09T02:00:00.000Z')
  ctx.db.exec('DROP TABLE machine_energy')
  ctx.time.advance(60_000)
  assert.equal(await again.sample(), true)
  assert.ok(ctx.logs.some((line) => line.startsWith('Énergie du mini PC : ') && !line.includes('sauté')))
})

test('current : null avant le premier relevé, puis la dernière puissance du processeur', async () => {
  const { answer, energy } = setup('2026-11-09T02:00:00Z')
  assert.equal(energy.current(), null)
  answer.current = 6
  await energy.sample()
  assert.equal(energy.current(), 6)
})
