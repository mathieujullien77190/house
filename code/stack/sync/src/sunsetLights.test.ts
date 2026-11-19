// Tests de l'allumage des lampes au coucher du soleil : l'heure prévue, le rattrapage, une fois par jour.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CATCH_UP_SECONDS, FULL_BRI, createSunsetLights, dayOf, nextSunsetRun } from './sunsetLights.ts'
import { sunTimes } from './sun.ts'
import type { ApiTarget } from './power.ts'
import { testContext } from './testing.ts'

const HOUSE = { latitude: 48.52, longitude: 2.64 }
const TARGET: ApiTarget = { url: 'https://api:8080', key: 'k', ca: 'CA', servername: 'localhost' }
const DAY = 86400
const NOV_9 = Date.UTC(2026, 10, 9) / 1000
const sunsetOf = (day: number): number => sunTimes(day, HOUSE)?.set ?? 0

test('dayOf : le jour UTC', () => {
  assert.equal(dayOf(Date.UTC(2026, 10, 18, 23, 59, 59) / 1000), '2026-11-18')
  assert.equal(dayOf(Date.UTC(2026, 10, 19) / 1000), '2026-11-19')
})

test('nextSunsetRun : le coucher d\'aujourd\'hui, rattrapé jusqu\'à une heure après, puis celui de demain', () => {
  const due = sunsetOf(NOV_9)
  assert.equal(nextSunsetRun(NOV_9, HOUSE, 0, null), due)
  assert.equal(nextSunsetRun(NOV_9, HOUSE, 600, null), due + 600)
  assert.equal(nextSunsetRun(due + 60, HOUSE, 0, null), due)
  assert.equal(nextSunsetRun(due + CATCH_UP_SECONDS, HOUSE, 0, null), due)
  assert.equal(nextSunsetRun(due + CATCH_UP_SECONDS + 1, HOUSE, 0, null), sunsetOf(NOV_9 + DAY))
  // déjà fait aujourd'hui : demain
  assert.equal(nextSunsetRun(NOV_9, HOUSE, 0, dayOf(due)), sunsetOf(NOV_9 + DAY))
  // un autre jour gardé ne gêne pas
  assert.equal(nextSunsetRun(NOV_9, HOUSE, 0, '2026-11-08'), due)
})

test('nextSunsetRun : sans coucher de soleil (nuit polaire ou soleil de minuit), personne', () => {
  const north = { latitude: 85, longitude: 0 }
  const june = Date.UTC(2026, 5, 21) / 1000
  assert.equal(nextSunsetRun(june, north, 0, null), null)
})

const make = (env: Record<string, string> = {}, send: (path: string, body: unknown) => Promise<void> = async () => undefined) => {
  const ctx = testContext(undefined, { SUNSET_LIGHTS: '3, 5', ...env })
  const sent: { method: string; path: string; body: unknown }[] = []
  let target: ApiTarget | null = TARGET
  const sunset = createSunsetLights(
    ctx,
    () => target,
    async (_target, method, path, body) => {
      sent.push({ method, path, body })
      await send(path, body)
    },
  )
  return { ctx, sunset, sent, setTarget: (value: ApiTarget | null) => void (target = value) }
}

test('tick : avant l\'heure, rien ; à l\'heure, les lampes s\'allument à fond, une seule fois par jour', async () => {
  const { ctx, sunset, sent } = make()
  const due = sunsetOf(NOV_9)
  ctx.time.set((due - 120) * 1000)
  assert.equal(await sunset.tick(), false)
  assert.equal(sent.length, 0)
  ctx.time.set((due + 30) * 1000)
  assert.equal(await sunset.tick(), true)
  assert.deepEqual(sent, [
    { method: 'PUT', path: '/hue/lights/3', body: { on: true, bri: FULL_BRI } },
    { method: 'PUT', path: '/hue/lights/5', body: { on: true, bri: FULL_BRI } },
  ])
  assert.equal(ctx.settings.sunsetLightsLastDay(), dayOf(due))
  assert.match(ctx.logs.at(-1) ?? '', /2 lampe\(s\) sur 2/)
  assert.equal(await sunset.tick(), false)
  assert.equal(sent.length, 2)
  // le lendemain, c'est reparti
  ctx.time.set((sunsetOf(NOV_9 + DAY) + 30) * 1000)
  assert.equal(await sunset.tick(), true)
  assert.equal(sent.length, 4)
})

test('tick : coupé, sans lampe ou sans API, rien ne part', async () => {
  const due = sunsetOf(NOV_9)
  const off = make()
  off.ctx.time.set((due + 30) * 1000)
  off.ctx.settings.saveSunsetLightsEnabled(false)
  assert.equal(await off.sunset.tick(), false)
  const none = make({ SUNSET_LIGHTS: '' })
  none.ctx.time.set((due + 30) * 1000)
  assert.equal(await none.sunset.tick(), false)
  const noApi = make()
  noApi.ctx.time.set((due + 30) * 1000)
  noApi.setTarget(null)
  assert.equal(await noApi.sunset.tick(), false)
  assert.equal(noApi.ctx.settings.sunsetLightsLastDay(), null)
  assert.equal(off.sent.length + none.sent.length + noApi.sent.length, 0)
})

test('tick : une lampe qui échoue ne gêne pas les autres ; aucune lampe allumée : le jour n\'est pas marqué, on retente', async () => {
  let failing = ['/hue/lights/3', '/hue/lights/5']
  const { ctx, sunset, sent } = make({}, async (path) => {
    if (failing.includes(path)) throw new Error('API : réponse 502')
  })
  const due = sunsetOf(NOV_9)
  ctx.time.set((due + 30) * 1000)
  assert.equal(await sunset.tick(), false)
  assert.equal(ctx.settings.sunsetLightsLastDay(), null)
  assert.match(ctx.logs.join('\n'), /la lampe 3 n'a pas été allumée \(API : réponse 502\)/)
  failing = ['/hue/lights/3']
  ctx.time.advance(60_000)
  assert.equal(await sunset.tick(), true)
  assert.match(ctx.logs.at(-1) ?? '', /1 lampe\(s\) sur 2/)
  assert.equal(ctx.settings.sunsetLightsLastDay(), dayOf(due))
  assert.equal(sent.length, 4)
})

test('next : la prochaine heure, null si l\'automatisation est coupée', () => {
  const { ctx, sunset } = make({ SUNSET_LIGHTS_OFFSET_MINUTES: '10' })
  ctx.time.set(NOV_9 * 1000)
  assert.equal(sunset.next(), sunsetOf(NOV_9) + 600)
  ctx.settings.saveSunsetLightsEnabled(false)
  assert.equal(sunset.next(), null)
})
