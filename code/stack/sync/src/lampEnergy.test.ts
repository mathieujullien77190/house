import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLampEnergy, readLampEnergy, type LampFetcher } from './lampEnergy.ts'
import { OFF_PEAK_PRICE_KWH, PEAK_PRICE_KWH } from './cameraEnergy.ts'
import type { ApiTarget } from './power.ts'
import { testContext } from './testing.ts'

const target: ApiTarget = { url: 'https://api:8080', key: 'k', ca: 'CA', servername: 'localhost' }
const at = (iso: string) => Date.parse(iso)
const lamp = (name: string, watts: number) => ({ lamp: name, watts })

/** Un échantillonneur dont l'API répond ce que `answer.current` dit (un tableau, ou une erreur). */
const setup = (start: string) => {
  const ctx = testContext()
  ctx.time.set(at(start))
  const answer: { current: ReturnType<typeof lamp>[] | Error } = { current: [] }
  const fetchLamps: LampFetcher = async () => {
    if (answer.current instanceof Error) throw answer.current
    return answer.current
  }
  const energy = createLampEnergy(ctx, () => target, fetchLamps)
  const rows = () => ctx.db.prepare('SELECT lamp, hour, wh_offpeak, wh_peak, cost FROM lamp_energy ORDER BY lamp, hour').all() as Record<string, unknown>[]
  return { ctx, answer, energy, rows }
}
const near = (actual: unknown, expected: number) => assert.ok(Math.abs(Number(actual) - expected) < 1e-9, `${String(actual)} différent de ${expected}`)

test('readLampEnergy : la lampe la plus gourmande d’abord', () => {
  const { ctx } = setup('2026-11-09T02:00:00Z')
  ctx.db.exec("INSERT INTO lamp_energy VALUES ('petite', 'h', 1, 0, 0.1), ('grande', 'h', 5, 0, 0.5), ('moyenne', 'h', 2, 1, 0.2)")
  assert.deepEqual(
    readLampEnergy(ctx.db).lamps.map((l) => l.lamp),
    ['grande', 'moyenne', 'petite'],
  )
})

test('un relevé normal en heures creuses : le premier pose la date de départ, le suivant compte la dernière puissance connue', async () => {
  const { ctx, answer, energy, rows } = setup('2026-11-09T02:00:00Z')
  assert.equal(readLampEnergy(ctx.db).since, null)
  answer.current = [lamp('a', 6), lamp('b', 12)]
  assert.equal(await energy.sample(), true)
  assert.equal(readLampEnergy(ctx.db).since, '2026-11-09T02:00:00.000Z')
  assert.deepEqual(rows(), [])
  ctx.time.advance(60_000)
  answer.current = [lamp('a', 100), lamp('b', 100)]
  await energy.sample()
  const [a, b] = rows()
  assert.equal(a.lamp, 'a')
  assert.equal(a.hour, '2026-11-09T02:00:00.000Z')
  near(a.wh_offpeak, 0.1)
  assert.equal(a.wh_peak, 0)
  near(a.cost, (0.1 * OFF_PEAK_PRICE_KWH) / 1000)
  near(b.wh_offpeak, 0.2)
  // un deuxième relevé s'ajoute à la même ligne (UPSERT) avec la puissance du relevé précédent
  ctx.time.advance(60_000)
  await energy.sample()
  near(rows()[0].wh_offpeak, 0.1 + 100 / 60)
  const totals = readLampEnergy(ctx.db)
  assert.deepEqual(
    totals.lamps.map((l) => l.lamp),
    ['b', 'a'],
  )
  near(totals.total.kwh, (0.1 + 0.2 + 200 / 60) / 1000)
  near(totals.total.cost, totals.lamps[0].cost + totals.lamps[1].cost)
})

test('un relevé à cheval sur 23:10 (Paris) se partage entre heures pleines et creuses, aux prix constants', async () => {
  const { ctx, answer, energy, rows } = setup('2026-11-09T22:08:00Z')
  answer.current = [lamp('a', 60)]
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
  answer.current = [lamp('a', 12)]
  await energy.sample()
  ctx.time.advance(2 * 60_000)
  answer.current = new Error('API : pas de réponse')
  assert.equal(await energy.sample(), false)
  assert.deepEqual(rows(), [])
  assert.ok(ctx.logs.some((line) => line.includes('Énergie des lampes : relevé sauté (API : pas de réponse)')))
  ctx.time.advance(60 * 60_000)
  answer.current = [lamp('a', 0)]
  await energy.sample()
  near(rows()[0].wh_offpeak, 1)
})

test('sans API configurée, rien ne se passe', async () => {
  const { ctx } = setup('2026-11-09T02:00:00Z')
  const none = createLampEnergy(ctx, () => null)
  assert.equal(await none.sample(), false)
})

test('la date de départ survit à un redémarrage ; une base qui échoue est notée sans tout casser', async () => {
  const { ctx, answer, energy } = setup('2026-11-09T02:00:00Z')
  answer.current = [lamp('a', 5)]
  await energy.sample()
  ctx.time.advance(60_000)
  const again = createLampEnergy(ctx, () => target, async () => [lamp('a', 5)])
  await again.sample()
  assert.equal(readLampEnergy(ctx.db).since, '2026-11-09T02:00:00.000Z')
  ctx.db.exec('DROP TABLE lamp_energy')
  ctx.time.advance(60_000)
  assert.equal(await again.sample(), true)
  assert.ok(ctx.logs.some((line) => line.startsWith('Énergie des lampes : ') && !line.includes('sauté')))
})

test('current : vide avant le premier relevé, puis la dernière puissance de chaque lampe', async () => {
  const { answer, energy } = setup('2026-11-09T02:00:00Z')
  assert.deepEqual([...energy.current()], [])
  answer.current = [lamp('a', 6), lamp('b', 12)]
  await energy.sample()
  assert.deepEqual([...energy.current()], [['a', 6], ['b', 12]])
})
