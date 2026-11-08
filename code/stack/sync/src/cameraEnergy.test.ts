import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCameraEnergy, isOffPeak, OFF_PEAK_PRICE_KWH, PEAK_PRICE_KWH, readCameraEnergy, slicesOf, type PowerFetcher } from './cameraEnergy.ts'
import type { ApiTarget } from './power.ts'
import { testContext } from './testing.ts'

const target: ApiTarget = { url: 'https://api:8080', key: 'k', ca: 'CA', servername: 'localhost' }
const at = (iso: string) => Date.parse(iso)
const cam = (camera: string, watts: number) => ({ camera, watts, powered: watts > 0 })

/** Un échantillonneur dont l'API répond ce que `answer.current` dit (un tableau, ou une erreur). */
const setup = (start: string) => {
  const ctx = testContext()
  ctx.time.set(at(start))
  const answer: { current: ReturnType<typeof cam>[] | Error } = { current: [] }
  const fetchPower: PowerFetcher = async () => {
    if (answer.current instanceof Error) throw answer.current
    return answer.current
  }
  const energy = createCameraEnergy(ctx, () => target, fetchPower)
  const rows = () => ctx.db.prepare('SELECT camera, hour, wh_offpeak, wh_peak, cost FROM camera_energy ORDER BY camera, hour').all() as Record<string, unknown>[]
  return { ctx, answer, energy, rows }
}
const near = (actual: unknown, expected: number) => assert.ok(Math.abs(Number(actual) - expected) < 1e-9, `${String(actual)} différent de ${expected}`)

test('isOffPeak : la plage 23:10 → 07:10 passe minuit', () => {
  // Novembre : Paris = UTC + 1.
  assert.equal(isOffPeak(at('2026-11-09T22:09:00Z')), false)
  assert.equal(isOffPeak(at('2026-11-09T22:10:00Z')), true)
  assert.equal(isOffPeak(at('2026-11-10T06:09:00Z')), true)
  assert.equal(isOffPeak(at('2026-11-10T06:10:00Z')), false)
})

test('slicesOf : coupé à chaque minute, jamais à cheval sur une heure', () => {
  const slices = slicesOf(at('2026-11-09T09:59:30Z'), at('2026-11-09T10:00:30Z'))
  assert.deepEqual(
    slices.map((s) => [s.hour, s.ms]),
    [
      ['2026-11-09T09:00:00.000Z', 30_000],
      ['2026-11-09T10:00:00.000Z', 30_000],
    ],
  )
  assert.deepEqual(slicesOf(5, 5), [])
})

test('un relevé normal en heures creuses : le premier pose la date de départ, le suivant compte la dernière puissance connue', async () => {
  const { ctx, answer, energy, rows } = setup('2026-11-09T02:00:00Z')
  assert.equal(readCameraEnergy(ctx.db).since, null)
  answer.current = [cam('a', 6), cam('b', 12)]
  assert.equal(await energy.sample(), true)
  assert.equal(readCameraEnergy(ctx.db).since, '2026-11-09T02:00:00.000Z')
  assert.deepEqual(rows(), [])
  ctx.time.advance(60_000)
  answer.current = [cam('a', 100), cam('b', 100)]
  await energy.sample()
  const [a, b] = rows()
  assert.equal(a.camera, 'a')
  assert.equal(a.hour, '2026-11-09T02:00:00.000Z')
  near(a.wh_offpeak, 0.1)
  assert.equal(a.wh_peak, 0)
  near(a.cost, (0.1 * OFF_PEAK_PRICE_KWH) / 1000)
  near(b.wh_offpeak, 0.2)
  // un deuxième relevé s'ajoute à la même ligne (UPSERT) avec la puissance du relevé précédent
  ctx.time.advance(60_000)
  await energy.sample()
  near(rows()[0].wh_offpeak, 0.1 + 100 / 60)
  const totals = readCameraEnergy(ctx.db)
  assert.deepEqual(
    totals.cameras.map((c) => c.camera),
    ['a', 'b'],
  )
  near(totals.total.kwh, (0.1 + 0.2 + 200 / 60) / 1000)
  near(totals.total.cost, totals.cameras[0].cost + totals.cameras[1].cost)
})

test('un relevé à cheval sur 23:10 (Paris) se partage entre heures pleines et creuses, aux prix constants', async () => {
  const { ctx, answer, energy, rows } = setup('2026-11-09T22:08:00Z')
  answer.current = [cam('a', 60)]
  await energy.sample()
  ctx.time.advance(4 * 60_000)
  await energy.sample()
  const [row] = rows()
  assert.equal(row.hour, '2026-11-09T22:00:00.000Z')
  near(row.wh_peak, 2)
  near(row.wh_offpeak, 2)
  near(row.cost, (2 * PEAK_PRICE_KWH + 2 * OFF_PEAK_PRICE_KWH) / 1000)
})

test('un trou de plus de 5 minutes est plafonné ; une panne de l’API ne compte rien', async () => {
  const { ctx, answer, energy, rows } = setup('2026-11-09T02:00:00Z')
  answer.current = [cam('a', 12)]
  await energy.sample()
  ctx.time.advance(2 * 60_000)
  answer.current = new Error('API : pas de réponse')
  assert.equal(await energy.sample(), false)
  assert.deepEqual(rows(), [])
  assert.ok(ctx.logs.some((line) => line.includes('relevé sauté (API : pas de réponse)')))
  ctx.time.advance(60 * 60_000)
  answer.current = [cam('a', 0)]
  await energy.sample()
  near(rows()[0].wh_offpeak, 1)
})

test('une caméra éteinte (0 W) ne consomme rien ; sans API configurée, rien ne se passe', async () => {
  const { ctx, answer, energy, rows } = setup('2026-11-09T02:00:00Z')
  answer.current = [cam('a', 0)]
  await energy.sample()
  ctx.time.advance(60_000)
  await energy.sample()
  assert.equal(rows()[0].wh_offpeak, 0)
  assert.equal(rows()[0].cost, 0)
  const none = createCameraEnergy(ctx, () => null)
  assert.equal(await none.sample(), false)
})

test('la date de départ survit à un redémarrage ; une base qui échoue est notée sans tout casser', async () => {
  const { ctx, answer, energy } = setup('2026-11-09T02:00:00Z')
  answer.current = [cam('a', 5)]
  await energy.sample()
  ctx.time.advance(60_000)
  const again = createCameraEnergy(ctx, () => target, async () => [cam('a', 5)])
  await again.sample()
  assert.equal(readCameraEnergy(ctx.db).since, '2026-11-09T02:00:00.000Z')
  ctx.db.exec('DROP TABLE camera_energy')
  ctx.time.advance(60_000)
  assert.equal(await again.sample(), true)
  assert.ok(ctx.logs.some((line) => line.startsWith('Énergie des caméras : ') && !line.includes('sauté')))
})
