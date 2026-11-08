import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { createHeatingLog } from '../lib/heatingLog.ts'
import { createHeatingSettings, DEFAULT_SETTINGS } from '../lib/heatingSettings.ts'
import { withTempDir } from '../testing/helpers.ts'
import { createHeatingService, createRecorder, type TemperatureSource } from './heatingService.ts'
import type { ActivationMeta, PlugService } from './plugService.ts'

const PARIS = { latitude: 48.6, longitude: 2.7 }
// Le 9 novembre 2026 à 01:00 UTC : la nuit à Paris ; à 12:00 UTC : le jour.
const NIGHT = Date.parse('2026-11-09T01:00:00Z')
const DAY = Date.parse('2026-11-09T12:00:00Z')

const flush = () => new Promise<void>((done) => setImmediate(done))

const setup = async (t: TestContext, dir: string, now = NIGHT, withTemperature = true) => {
  t.mock.timers.reset()
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now })
  const state = { on: false, getFails: false, startFails: false, celsius: 1 as number | null | Error, started: [] as [number, boolean, ActivationMeta][], gets: 0, gate: null as Promise<void> | null }
  const plug = {
    get: async () => {
      state.gets += 1
      if (state.gate) await state.gate
      if (state.getFails) throw new Error('prise injoignable')
      return { on: state.on }
    },
    startTimer: async (minutes: number, watch: boolean, meta: ActivationMeta) => {
      if (state.startFails) throw new Error('prise injoignable')
      state.started.push([minutes, watch, meta])
      state.on = true
    },
  } as unknown as PlugService
  const temperature: TemperatureSource = {
    read: async () => {
      if (state.celsius instanceof Error) throw state.celsius
      return state.celsius
    },
  }
  const warnings: string[] = []
  const log = createHeatingLog(join(dir, 'log.jsonl'))
  const settings = createHeatingSettings(join(dir, 'heating.json'))
  const heating = createHeatingService({ plug, settings, log, temperature: withTemperature ? temperature : null, position: PARIS, warn: (message) => warnings.push(message) })
  return { state, warnings, log, settings, heating }
}

test('froid, nuit, prise éteinte : la prise est allumée pour la durée réglée, notée « auto » avec la température', async (t) => {
  await withTempDir(async (dir) => {
    const { state, heating, log, settings } = await setup(t, dir)
    settings.set({ ...DEFAULT_SETTINGS, minutes: 7, cooldownMinutes: 30 })
    await heating.tick()
    assert.deepEqual(state.started, [[7, false, { origin: 'auto', temperature: 1, note: null }]])
    // la ligne du journal vient de plugService (simulé ici) : on y met la même
    log.append({ at: NIGHT / 1000, origin: 'auto', minutes: 7, temperature: 1, note: null, cost: null })
    // la prise est allumée : rien de plus
    await heating.tick()
    assert.equal(state.started.length, 1)
  })
})

test('le délai de réactivation se compte depuis le début de la dernière activation, de toute origine', async (t) => {
  await withTempDir(async (dir) => {
    const { state, heating, log } = await setup(t, dir)
    log.append({ at: NIGHT / 1000 - 19 * 60, origin: 'manuel', minutes: 5, temperature: null, note: null, cost: null })
    await heating.tick()
    assert.equal(state.started.length, 0)
    // une minute plus tard (20 min depuis le début de l'activation), le tour de la minute chauffe
    t.mock.timers.tick(60_000)
    await flush()
    await flush()
    assert.equal(state.started.length, 1)
    void heating
  })
})

test('rien ne se passe : règle coupée, jour, pas assez froid, ou pas de pont Hue', async (t) => {
  await withTempDir(async (dir) => {
    const { state, heating, settings } = await setup(t, dir)
    settings.set({ ...DEFAULT_SETTINGS, enabled: false })
    await heating.tick()
    settings.set(DEFAULT_SETTINGS)
    state.celsius = 3
    await heating.tick()
    state.celsius = 10
    await heating.tick()
    assert.equal(state.started.length, 0)
  })
  await withTempDir(async (dir) => {
    const { state, heating } = await setup(t, dir, DAY)
    await heating.tick()
    assert.equal(state.started.length, 0)
  })
  await withTempDir(async (dir) => {
    const { state, heating } = await setup(t, dir, NIGHT, false)
    assert.equal(heating.canRule, false)
    await heating.tick()
    assert.equal(state.started.length, 0)
  })
})

test('une prise injoignable : on réessaie au tour suivant, sans bruit', async (t) => {
  await withTempDir(async (dir) => {
    const { state, heating, warnings } = await setup(t, dir)
    state.getFails = true
    await heating.tick()
    assert.deepEqual([state.started.length, warnings.length], [0, 0])
    state.getFails = false
    await heating.tick()
    assert.equal(state.started.length, 1)
  })
})

test('température inconnue ou pont injoignable : pas de chauffage, dit une seule fois', async (t) => {
  await withTempDir(async (dir) => {
    const { state, heating, warnings } = await setup(t, dir)
    state.celsius = null
    await heating.tick()
    await heating.tick()
    state.celsius = new Error('pont injoignable')
    await heating.tick()
    assert.equal(state.started.length, 0)
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /^Chauffage : température de la volière inconnue/)
    // elle revient, puis disparaît de nouveau : on le redit
    state.celsius = 20
    await heating.tick()
    state.celsius = null
    await heating.tick()
    assert.equal(warnings.length, 2)
  })
})

test('une commande refusée par la prise est dite une fois', async (t) => {
  await withTempDir(async (dir) => {
    const { state, heating, warnings } = await setup(t, dir)
    state.startFails = true
    await heating.tick()
    await heating.tick()
    assert.deepEqual(warnings, ['Chauffage : la prise ne répond pas : pas de chauffage'])
  })
})

test('le tour tourne toutes les 60 s, sans se chevaucher', async (t) => {
  await withTempDir(async (dir) => {
    const { state } = await setup(t, dir)
    t.mock.timers.tick(60_000)
    await flush()
    await flush()
    assert.equal(state.started.length, 1)
  })
  await withTempDir(async (dir) => {
    const { state } = await setup(t, dir)
    // un tour lent : le suivant est sauté
    let release = () => {}
    state.gate = new Promise<void>((done) => (release = done))
    t.mock.timers.tick(60_000)
    t.mock.timers.tick(60_000)
    await flush()
    assert.equal(state.gets, 1)
    release()
    await flush()
    await flush()
    assert.equal(state.started.length, 1)
  })
})

test('réglages, état et journal : status, update, log, settings', async (t) => {
  await withTempDir(async (dir) => {
    const { heating, log, state } = await setup(t, dir)
    assert.equal(heating.canRule, true)
    assert.deepEqual(heating.settings(), DEFAULT_SETTINGS)
    assert.equal(typeof heating.update({ thresholdC: 4 }), 'object')
    assert.equal(heating.settings().thresholdC, 4)
    assert.equal(typeof heating.update({ thresholdC: 99 }), 'string')
    assert.equal(heating.settings().thresholdC, 4)

    let status = await heating.status()
    assert.deepEqual([status.lastActivationAt, status.nextAllowedAt, status.temperature, status.night, status.cold], [null, null, 1, true, true])
    state.celsius = null
    log.append({ at: 1000, origin: 'auto', minutes: 5, temperature: 1, note: null, cost: 0.0265 })
    status = await heating.status()
    assert.deepEqual([status.lastActivationAt, status.nextAllowedAt, status.temperature, status.cold], [1000, 1000 + 20 * 60, null, false])
    state.celsius = new Error('pont')
    assert.equal((await heating.status()).temperature, null)
    assert.deepEqual(heating.log(10).map((entry) => entry.at), [1000])
  })
  await withTempDir(async (dir) => {
    const { heating } = await setup(t, dir, DAY, false)
    const status = await heating.status()
    assert.deepEqual([status.temperature, status.night, status.cold], [null, false, false])
  })
})

test('l’enregistreur calcule le coût prévu avec les réglages du moment', async () => {
  await withTempDir((dir) => {
    const log = createHeatingLog(join(dir, 'log.jsonl'))
    const settings = createHeatingSettings(join(dir, 'heating.json'))
    const record = createRecorder(log, settings)
    record({ at: Date.parse('2026-11-09T02:00:00Z') / 1000, origin: 'manuel', minutes: 5, temperature: null, note: null })
    settings.set({ ...DEFAULT_SETTINGS, heaterWatts: null })
    record({ at: Date.parse('2026-11-09T02:10:00Z') / 1000, origin: 'auto', minutes: 5, temperature: 2, note: null })
    assert.deepEqual(log.recent(2).map((entry) => entry.cost), [null, 0.0265])
  })
})
