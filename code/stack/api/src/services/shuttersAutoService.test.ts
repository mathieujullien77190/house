import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ShutterAutoStore, AutoStates } from '../lib/shutterAutoStore.ts'
import { sunTimes } from '../lib/sun.ts'
import { crossedEvents, createShuttersAuto, MAX_LATE_SECONDS } from './shuttersAutoService.ts'
import type { ShuttersService } from './shuttersService.ts'

const POSITION = { latitude: 48.6, longitude: 2.7 }
const DAY = 86400
const DAY_START = Date.UTC(2026, 5, 21) / 1000
const TIMES = sunTimes(DAY_START, POSITION)!

const setup = (initial: AutoStates, now: number, ids = ['1', '2']) => {
  let states = initial
  const store: ShutterAutoStore = { get: () => states, set: (next) => void (states = next) }
  const sent: string[] = []
  const state = { fail: false }
  const shutters = {
    command: async (id: string, command: string, note: string | null) => {
      if (state.fail) throw new Error('KO')
      sent.push(`${id} ${command} ${note}`)
    },
  } as unknown as ShuttersService
  const clock = { now }
  const auto = createShuttersAuto({ ids, shutters, store, position: POSITION, now: () => clock.now })
  return { auto, sent, state, clock, states: () => states }
}

test('crossedEvents : le lever et le coucher d’un jour connu, dans l’ordre', () => {
  const events = crossedEvents(DAY_START, DAY_START + DAY, POSITION)
  assert.deepEqual(
    events.map((event) => [event.at, event.command]),
    [
      [TIMES.rise, 'up'],
      [TIMES.set, 'down'],
    ],
  )
  assert.deepEqual(
    crossedEvents(TIMES.rise, TIMES.set, POSITION).map((event) => event.command),
    ['down'],
  )
  assert.deepEqual(crossedEvents(TIMES.set, TIMES.set + 10, POSITION), [])
})

test('crossedEvents : au pôle en été, rien', () => {
  assert.deepEqual(crossedEvents(DAY_START, DAY_START + DAY, { latitude: 89, longitude: 0 }), [])
})

test('un lever passé : l’ordre part et since avance', async () => {
  const { auto, sent, states } = setup({ '1': { open: true, close: true, since: TIMES.rise - 600 } }, TIMES.rise + 60)
  await auto.tick()
  assert.deepEqual(sent, ['1 up auto : lever du soleil'])
  assert.equal(states()['1'].since, TIMES.rise + 60)
})

test('les options open et close sont indépendantes', async () => {
  const onlyClose = setup({ '1': { open: false, close: true, since: TIMES.rise - 600 } }, TIMES.set + 60)
  await onlyClose.auto.tick()
  assert.deepEqual(onlyClose.sent, ['1 down auto : coucher du soleil'])
  const onlyOpen = setup({ '1': { open: true, close: false, since: TIMES.rise - 600 } }, TIMES.set + 60)
  await onlyOpen.auto.tick()
  assert.deepEqual(onlyOpen.sent, [])
})

test('un ordre trop vieux est sauté mais compté', async () => {
  const { auto, sent, states } = setup({ '1': { open: true, close: true, since: TIMES.rise - 600 } }, TIMES.rise + MAX_LATE_SECONDS + 1)
  await auto.tick()
  assert.deepEqual(sent, [])
  assert.equal(states()['1'].since, TIMES.rise + MAX_LATE_SECONDS + 1)
})

test('un échec n’avance pas since, et le tour suivant réessaie', async () => {
  const { auto, sent, state, clock, states } = setup({ '1': { open: true, close: true, since: TIMES.rise - 600 } }, TIMES.rise + 60)
  state.fail = true
  await auto.tick()
  assert.deepEqual(sent, [])
  assert.equal(states()['1'].since, TIMES.rise - 600)
  state.fail = false
  clock.now = TIMES.rise + 120
  await auto.tick()
  assert.deepEqual(sent, ['1 up auto : lever du soleil'])
})

test('un volet sans réglage, sans option ou sans événement n’est pas touché', async () => {
  const { auto, sent, states } = setup({ '2': { open: false, close: false, since: 1 } }, TIMES.rise + 60)
  await auto.tick()
  assert.deepEqual(sent, [])
  assert.deepEqual(states(), { '2': { open: false, close: false, since: 1 } })
  const none = setup({ '1': { open: true, close: true, since: TIMES.rise + 10 } }, TIMES.rise + 20)
  await none.auto.tick()
  assert.equal(none.states()['1'].since, TIMES.rise + 20)
  const same = setup({ '1': { open: true, close: true, since: TIMES.rise + 20 } }, TIMES.rise + 20)
  await same.auto.tick()
  assert.equal(same.states()['1'].since, TIMES.rise + 20)
})

test('state et setOptions', () => {
  const { auto, states } = setup({ '1': { open: true, close: false, since: 1 } }, 1000)
  assert.deepEqual(auto.ids, ['1', '2'])
  assert.deepEqual(auto.state(), { '1': { open: true, close: false }, '2': { open: false, close: false } })
  assert.equal(auto.setOptions('9', { open: true }), false)
  assert.equal(auto.setOptions('1', { close: true }), true)
  assert.deepEqual(states()['1'], { open: true, close: true, since: 1000 })
  assert.equal(auto.setOptions('2', { open: true }), true)
  assert.deepEqual(states()['2'], { open: true, close: false, since: 1000 })
  assert.equal(auto.setOptions('2', {}), true)
  assert.deepEqual(states()['2'], { open: true, close: false, since: 1000 })
})

test('le tour se joue chaque minute', async (context) => {
  context.mock.timers.enable({ apis: ['setInterval'] })
  const { sent } = setup({ '1': { open: true, close: true, since: TIMES.rise - 600 } }, TIMES.rise + 60)
  context.mock.timers.tick(60_000)
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(sent, ['1 up auto : lever du soleil'])
})
