import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { HueClient, HueGroup, HueLight, HueSchedule, HueSensor } from '../lib/hueClient.ts'
import type { PositionsStore } from '../lib/positionsStore.ts'
import { createHueService, FadeImpossible, parseState, toSensors, UnknownHueId } from './hueService.ts'

test('un état valable : on et/ou bri entre 1 et 254', () => {
  assert.deepEqual(parseState({ on: true }), { on: true })
  assert.deepEqual(parseState({ bri: 254, on: false }), { on: false, bri: 254 })
  assert.deepEqual(parseState({ bri: 1 }), { bri: 1 })
})

test('un état mal formé est refusé', () => {
  assert.equal(parseState(null), null)
  assert.equal(parseState('on'), null)
  assert.equal(parseState({}), null)
  assert.equal(parseState({ on: 'oui' }), null)
  assert.equal(parseState({ bri: '5' }), null)
  assert.equal(parseState({ bri: 1.5 }), null)
  assert.equal(parseState({ bri: 0 }), null)
  assert.equal(parseState({ bri: 255 }), null)
})

const sensor = (type: string, uniqueid: string | undefined, state: HueSensor['state'], config: HueSensor['config'] = {}): HueSensor => ({
  name: `capteur ${type}`,
  type,
  uniqueid,
  state,
  config,
})

test('un détecteur réunit mouvement, luminosité et température du même appareil', () => {
  const sensors = toSensors({
    '1': sensor(
      'ZLLPresence',
      '00:17:aa-02-0406',
      { presence: true, lastupdated: '2026-11-03T01:55:59' },
      { battery: 80, reachable: true },
    ),
    '2': sensor('ZLLLightLevel', '00:17:aa-02-0400', { lightlevel: 10001, dark: false }),
    '3': sensor('ZLLTemperature', '00:17:aa-02-0402', { temperature: 2154 }),
    '4': sensor('ZLLTemperature', '00:17:bb-02-0402', { temperature: 9999 }),
    // sans adresse radio : aucun frère
    '5': sensor('ZLLPresence', undefined, { presence: null, lastupdated: 'none' }),
    '6': sensor('ZLLLightLevel', undefined, { lightlevel: 5 }),
    // frères aux valeurs inconnues
    '7': sensor('ZLLPresence', '00:17:cc-02-0406', {}),
    '8': sensor('ZLLLightLevel', '00:17:cc-02-0400', { lightlevel: null }),
    '9': sensor('ZLLTemperature', '00:17:cc-02-0402', { temperature: null }),
    '10': sensor('Daylight', undefined, {}),
  })
  assert.deepEqual(sensors, [
    {
      id: '1',
      name: 'capteur ZLLPresence',
      presence: true,
      presenceSince: '2026-11-03T01:55:59Z',
      temperature: 21.5,
      lux: 10,
      dark: false,
      battery: 80,
      reachable: true,
    },
    {
      id: '5',
      name: 'capteur ZLLPresence',
      presence: null,
      presenceSince: null,
      temperature: null,
      lux: null,
      dark: null,
      battery: null,
      reachable: false,
    },
    {
      id: '7',
      name: 'capteur ZLLPresence',
      presence: null,
      presenceSince: null,
      temperature: null,
      lux: null,
      dark: null,
      battery: null,
      reachable: false,
    },
  ])
})

interface Fake {
  hue: HueClient
  calls: string[]
  lights: Record<string, HueLight>
  groups: Record<string, HueGroup>
  schedules: Record<string, HueSchedule>
  timers: unknown[]
  v2: Record<string, unknown[]>
  sensors: Record<string, HueSensor>
}

const fakeHue = (): Fake => {
  const fake: Fake = {
    calls: [],
    lights: {
      '1': { name: 'Plafonnier', state: { on: true, bri: 100, reachable: true } },
      '2': { name: 'Lampe', state: { on: false, reachable: true } },
      '3': { name: 'Seule', state: { on: false, reachable: false } },
      '4': { name: 'Éteinte', state: { on: false, reachable: true } },
    },
    groups: {
      '10': {
        name: 'Salon',
        type: 'Room',
        lights: ['1', '2', '99'],
        state: { any_on: true, all_on: false },
        action: { on: true, bri: 120 },
      },
      '11': { name: 'Chambre', type: 'Room', lights: [], state: { any_on: false, all_on: false }, action: { on: false } },
      '12': { name: 'Zone', type: 'Zone', lights: ['3'], state: { any_on: false, all_on: false }, action: { on: false } },
    },
    schedules: {},
    timers: [],
    v2: { behavior_instance: [], room: [], light: [], scene: [] },
    sensors: {},
    hue: undefined as unknown as HueClient,
  }
  fake.hue = {
    v2: async <T>(path: string) => fake.v2[path] as T[],
    sensors: async () => fake.sensors,
    lights: async () => fake.lights,
    groups: async () => fake.groups,
    setLight: async (id, state) => void fake.calls.push(`light ${id} ${JSON.stringify(state)}`),
    setGroup: async (id, state) => void fake.calls.push(`group ${id} ${JSON.stringify(state)}`),
    schedules: async () => fake.schedules,
    createTimer: async (timer) => {
      fake.timers.push(timer)
      return 'timer-1'
    },
    deleteSchedule: async (id) => void fake.calls.push(`delete ${id}`),
    commandBase: '/api/cle',
  }
  return fake
}

const fakePositions = (): PositionsStore => {
  let positions = {}
  return {
    get: () => positions,
    merge: (changes) => (positions = { ...positions, ...changes }),
  }
}

test('les pièces et les lampes isolées', async () => {
  const fake = fakeHue()
  const service = createHueService(fake.hue, fakePositions())
  assert.deepEqual(await service.list(), [
    {
      id: '10',
      name: 'Salon',
      on: true,
      bri: 120,
      lights: [
        { id: '1', name: 'Plafonnier', on: true, bri: 100, reachable: true, color: null },
        { id: '2', name: 'Lampe', on: false, bri: null, reachable: true, color: null },
      ],
    },
    { id: '11', name: 'Chambre', on: false, bri: null, lights: [] },
    {
      id: 'other',
      name: 'Autres',
      on: false,
      bri: null,
      lights: [
        { id: '3', name: 'Seule', on: false, bri: null, reachable: false, color: null },
        { id: '4', name: 'Éteinte', on: false, bri: null, reachable: true, color: null },
      ],
    },
  ])
  // sans lampe isolée : pas de pièce « Autres »
  fake.lights = { '1': fake.lights['1'], '2': fake.lights['2'] }
  assert.equal(
    (await service.list()).some((room) => room.id === 'other'),
    false,
  )
  // une lampe isolée allumée allume « Autres »
  fake.lights = { '5': { name: 'Allumée', state: { on: true, reachable: true } } }
  assert.equal((await service.list()).at(-1)?.on, true)
})

test('règles, détecteurs et positions', async () => {
  const fake = fakeHue()
  fake.v2.room = [{ id: 'r', metadata: { name: 'Cuisine' } }]
  fake.v2.behavior_instance = [
    {
      id: 'b',
      enabled: true,
      status: 's',
      script_id: 'x',
      metadata: { name: 'R' },
      configuration: { where: [{ group: { rid: 'r', rtype: 'room' } }] },
    },
  ]
  fake.sensors = { '1': sensor('ZLLPresence', undefined, { presence: false }) }
  const service = createHueService(fake.hue, fakePositions())
  assert.equal((await service.automations())[0].lines[0], 'Pièces : Cuisine')
  assert.equal((await service.sensors())[0].presence, false)
  assert.deepEqual(service.positions(), {})
  assert.deepEqual(service.setPositions({ '1': { x: 1, y: 2 } }), { '1': { x: 1, y: 2 } })
  assert.deepEqual(service.positions(), { '1': { x: 1, y: 2 } })
})

test('allumer une pièce ou une lampe, avec un identifiant numérique seulement', async () => {
  const fake = fakeHue()
  const service = createHueService(fake.hue, fakePositions())
  assert.equal((await service.setRoom('10', { on: false })).length, 3)
  assert.equal((await service.setLight('1', { bri: 5 })).length, 3)
  assert.deepEqual(fake.calls, ['group 10 {"on":false}', 'light 1 {"bri":5}'])
  await assert.rejects(() => service.setRoom('a/b', { on: true }), UnknownHueId)
  await assert.rejects(() => service.setLight('../1', { on: true }), UnknownHueId)
})

test('l’état de l’extinction en douceur et sa fin', async () => {
  const fake = fakeHue()
  const service = createHueService(fake.hue, fakePositions())
  await assert.rejects(() => service.fade.status('x'), UnknownHueId)
  assert.deepEqual(await service.fade.status('1'), { fading: false, ends_at: null })
  fake.schedules = {
    a: { name: 'autre' },
    b: { name: 'house-fade-1', localtime: 'PT00:15:05', starttime: '2026-11-08T15:00:00' },
  }
  assert.deepEqual(await service.fade.status('1'), { fading: true, ends_at: Date.parse('2026-11-08T15:00:00Z') / 1000 + 15 * 60 + 5 })
  // durée ou début illisibles : en cours, fin inconnue
  fake.schedules = { b: { name: 'house-fade-1', localtime: 'PT00:15:05' } }
  assert.deepEqual(await service.fade.status('1'), { fading: true, ends_at: null })
  fake.schedules = { b: { name: 'house-fade-1', localtime: 'bientôt', starttime: '2026-11-08T15:00:00' } }
  assert.deepEqual(await service.fade.status('1'), { fading: true, ends_at: null })
  fake.schedules = { b: { name: 'house-fade-1', starttime: '2026-11-08T15:00:00' } }
  assert.deepEqual(await service.fade.status('1'), { fading: true, ends_at: null })
  fake.schedules = { b: { name: 'house-fade-1', localtime: 'PT00:15:05', starttime: 'pas une date' } }
  assert.deepEqual(await service.fade.status('1'), { fading: true, ends_at: null })
})

test('démarrer l’extinction : transition du pont puis minuteur qui rend la luminosité', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 5_000_000 })
  const fake = fakeHue()
  const service = createHueService(fake.hue, fakePositions())
  await assert.rejects(() => service.fade.start('x', 5), UnknownHueId)
  await assert.rejects(() => service.fade.start('99', 5), UnknownHueId)
  await assert.rejects(() => service.fade.start('2', 5), FadeImpossible)
  await assert.rejects(() => service.fade.start('3', 5), FadeImpossible)

  // un minuteur déjà là est remplacé
  fake.schedules = { old: { name: 'house-fade-1', description: 'bri=77' } }
  const result = await service.fade.start('1', 15)
  assert.deepEqual(result, { fading: true, ends_at: 5000 + 15 * 60 + 5 })
  assert.deepEqual(fake.calls, ['delete old', 'light 1 {"bri":1,"transition":9000}'])
  assert.deepEqual(fake.timers, [
    {
      name: 'house-fade-1',
      description: 'bri=100',
      localtime: 'PT00:15:05',
      command: { address: '/api/cle/lights/1/state', method: 'PUT', body: { on: false, bri: 100, transitiontime: 0 } },
    },
  ])

  // luminosité inconnue : 254 ; la transition ne dépasse pas 65535
  fake.lights['1'] = { name: 'Plafonnier', state: { on: true, reachable: true } }
  fake.schedules = {}
  fake.calls.length = 0
  fake.timers.length = 0
  await service.fade.start('1', 60)
  assert.deepEqual(fake.calls, ['light 1 {"bri":1,"transition":36000}'])
  assert.equal((fake.timers[0] as { description: string; localtime: string }).description, 'bri=254')
  assert.equal((fake.timers[0] as { localtime: string }).localtime, 'PT01:00:05')
  fake.calls.length = 0
  await service.fade.start('1', 1000)
  assert.deepEqual(fake.calls, ['light 1 {"bri":1,"transition":65535}'])
})

test('annuler l’extinction rend la luminosité d’avant', async () => {
  const fake = fakeHue()
  const service = createHueService(fake.hue, fakePositions())
  await assert.rejects(() => service.fade.cancel('x'), UnknownHueId)
  fake.schedules = {
    a: { name: 'house-fade-1', description: 'bri=100' },
    b: { name: 'house-fade-1' },
    c: { name: 'house-fade-1', description: 'bri=0' },
    d: { name: 'house-fade-2', description: 'bri=50' },
  }
  assert.deepEqual(await service.fade.cancel('1'), { fading: false, ends_at: null })
  assert.deepEqual(fake.calls, ['delete a', 'light 1 {"bri":100,"transition":20}', 'delete b', 'delete c'])
})
