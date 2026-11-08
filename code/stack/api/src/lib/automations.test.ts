import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeAutomations, describeWhen, type BehaviorInstance } from './automations.ts'

test('quand : jours, heure ou plage, transition', () => {
  assert.equal(describeWhen({ start_at: { time_point: { time: { hour: 7, minute: 5 } } } }), 'Une fois à 07:05')
  assert.equal(describeWhen({ recurrence_days: [], start_at: { time_point: { time: { hour: 7, minute: 5 } } } }), 'Une fois à 07:05')
  assert.equal(
    describeWhen({
      recurrence_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      start_at: { time_point: { time: { hour: 10, minute: 0 } } },
    }),
    'Tous les jours à 10:00',
  )
  assert.equal(
    describeWhen({
      recurrence_days: ['monday', 'someday'],
      start_at: { time_point: { time: { hour: 7, minute: 0 } }, transition: { minutes: 5 } },
      end_at: { time_point: { time: { hour: 8, minute: 30 } } },
    }),
    'lundi, someday de 07:00 à 08:30 (en 5 min)',
  )
  // ni début ni fin connus : seule la mise en forme reste
  assert.equal(describeWhen({}), 'Une fois à ')
})

const instance = (configuration: BehaviorInstance['configuration'], extra: Partial<BehaviorInstance> = {}): BehaviorInstance => ({
  id: 'i',
  enabled: true,
  status: 'running',
  script_id: 's',
  metadata: { name: 'Règle' },
  configuration,
  ...extra,
})

const rooms = [{ id: 'r1', metadata: { name: 'Cuisine' } }, { id: 'r2' }]
const lights = [{ id: 'l1', metadata: { name: 'Plafonnier' } }]
const scenes = [{ id: 's1', metadata: { name: 'Lumineux' } }]

test('un horaire : quand, pièces avec leurs lampes, action sans doublon', () => {
  const [dto] = describeAutomations(
    [
      instance({
        when_extended: { start_at: { time_point: { time: { hour: 10, minute: 0 } } } },
        where: [
          {
            group: { rid: 'r1', rtype: 'room' },
            items: [
              { rid: 'l1', rtype: 'light' },
              { rid: 'inconnue', rtype: 'light' },
            ],
          },
          { group: { rid: 'r2', rtype: 'room' } },
          {},
        ],
        what: [
          { recall: { rid: 's1', rtype: 'scene' } },
          { recall: { rid: 's1', rtype: 'scene' } },
          { recall: { rid: 'zzz', rtype: 'scene' } },
          { recall: { rid: 'x', rtype: 'recipe' } },
          { recall: { rid: 'x', rtype: 'autre' } },
          {},
        ],
      }),
    ],
    rooms,
    lights,
    scenes,
  )
  assert.deepEqual(dto, {
    id: 'i',
    name: 'Règle',
    enabled: true,
    kind: 'horaire',
    lines: [
      'Une fois à 10:00',
      'Pièces : Cuisine (Plafonnier, ?), ?, ?',
      'Action : scène « Lumineux » ; scène « ? » ; éteindre ; action inconnue',
    ],
  })
})

test('une règle sans rien de lisible est « non décrite », sans nom elle s’appelle ?', () => {
  const [dto] = describeAutomations([instance({}, { metadata: undefined })], [], [], [])
  assert.deepEqual(dto, { id: 'i', name: '?', enabled: true, kind: 'horaire', lines: ['Règle non décrite'] })
})

test('un détecteur : tranches triées, actions et absence de mouvement', () => {
  const [dto] = describeAutomations(
    [
      instance({
        motion: {
          when: {
            timeslots: [
              {
                start_time: { time: { hour: 20, minute: 0 } },
                on_motion: { recall_single: [{ action: { recall: { rid: 's1', rtype: 'scene' } } }] },
                on_no_motion: { after: { minutes: 3 }, recall_single: [{ action: 'all_off' }] },
              },
              {
                on_motion: { recall_single: [{ action: 'do_nothing' }] },
                on_no_motion: { recall_single: [{ action: { recall: undefined } }] },
              },
              { start_time: { time: { hour: 6, minute: 0 } }, on_motion: { recall_single: [{ action: null }] } },
              { start_time: { time: { hour: 7, minute: 0 } } },
            ],
          },
        },
      }),
    ],
    rooms,
    lights,
    scenes,
  )
  assert.equal(dto.kind, 'capteur')
  assert.deepEqual(dto.lines, [
    'À partir de  : mouvement → rien ; sans mouvement pendant ? min → action inconnue',
    'À partir de 06:00 : mouvement → action inconnue',
    'À partir de 07:00 : mouvement → action inconnue',
    'À partir de 20:00 : mouvement → scène « Lumineux » ; sans mouvement pendant 3 min → tout éteindre',
  ])
})

test('les règles actives d’abord, puis par nom', () => {
  const names = describeAutomations(
    [
      instance({}, { id: '1', enabled: false, metadata: { name: 'A' } }),
      instance({}, { id: '2', metadata: { name: 'Z' } }),
      instance({}, { id: '3', metadata: { name: 'B' } }),
    ],
    [],
    [],
    [],
  ).map((dto) => dto.id)
  assert.deepEqual(names, ['3', '2', '1'])
})
