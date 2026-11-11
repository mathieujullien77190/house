// Tests du journal des lampes Hue (pont simulé : https et fetch remplacés).
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, mock, test } from 'node:test'
import { changeOf, createHueLog, localClock, parseLogQuery, purgeHueLog, schedulesOf } from './hueLog.ts'
import type { HueStreamItem } from './hueStream.ts'
import { clock, fakeHttpsGet, flush, type BridgeAnswer } from './testing.ts'

afterEach(() => {
  mock.timers.reset()
  mock.restoreAll()
})

test('changeOf : lampe (allumée, luminosité arrondie, température, couleur)', () => {
  assert.deepEqual(changeOf({ type: 'light', on: { on: true } }), { on: true })
  assert.deepEqual(changeOf({ type: 'light', dimming: { brightness: 33.349 } }), { brightness: 33.3 })
  assert.deepEqual(changeOf({ type: 'light', color_temperature: { mirek: 300 }, color: { xy: { x: 1, y: 2 } } }), { mirek: 300, color: { x: 1, y: 2 } })
  assert.equal(changeOf({ type: 'light', on: 'oui', dimming: 3, color: 4 }), null)
  assert.equal(changeOf({ type: 'light' }), null)
})

test('changeOf : scène, interrupteur, détecteur, liaison radio, le reste', () => {
  assert.deepEqual(changeOf({ type: 'scene', status: { active: 'static' } }), { active: 'static' })
  assert.equal(changeOf({ type: 'scene', status: {} }), null)
  assert.deepEqual(changeOf({ type: 'button', button: { button_report: { event: 'initial_press' } } }), { event: 'initial_press' })
  assert.deepEqual(changeOf({ type: 'button', button: { last_event: 'initial_press' } }), { event: 'initial_press' })
  assert.equal(changeOf({ type: 'button', button: { button_report: { event: 'repeat' } } }), null)
  assert.deepEqual(changeOf({ type: 'motion', motion: { motion_report: { motion: true } } }), { motion: true })
  assert.deepEqual(changeOf({ type: 'motion', motion: { motion: false } }), { motion: false })
  assert.equal(changeOf({ type: 'motion', motion: { motion: 'x' } }), null)
  assert.deepEqual(changeOf({ type: 'zigbee_connectivity', status: 'connected' }), { status: 'connected' })
  assert.equal(changeOf({ type: 'zigbee_connectivity' }), null)
  assert.equal(changeOf({ type: 'temperature' }), null)
})

test('parseLogQuery : valeurs par défaut et bornes', () => {
  const now = Date.UTC(2026, 10, 9)
  const base = parseLogQuery(new URLSearchParams(), now)
  assert.deepEqual(base, { since: now / 1000 - 86_400, limit: 100, origin: null, name: null })
  assert.equal(parseLogQuery(new URLSearchParams('since=1000'), now).since, 1000)
  assert.equal(parseLogQuery(new URLSearchParams('since=1700000000000'), now).since, 1_700_000_000)
  assert.equal(parseLogQuery(new URLSearchParams('since=2026-11-01T00:00:00Z'), now).since, Date.UTC(2026, 10, 1) / 1000)
  assert.equal(parseLogQuery(new URLSearchParams('since=nimporte'), now).since, now / 1000 - 86_400)
  const query = parseLogQuery(new URLSearchParams(`limit=9999&origin=switch&name=${encodeURIComponent('  Perruche  ')}`), now)
  assert.deepEqual([query.limit, query.origin, query.name], [500, 'switch', 'Perruche'])
  assert.equal(parseLogQuery(new URLSearchParams('limit=0&origin=autre&name=%20'), now).limit, 100)
  assert.equal(parseLogQuery(new URLSearchParams('limit=abc'), now).limit, 100)
  assert.equal(parseLogQuery(new URLSearchParams('origin=autre'), now).origin, null)
})

test('schedulesOf : les règles actives à heure fixe, dites en clair', () => {
  const rule = (patch: Record<string, unknown>) => ({
    enabled: true,
    metadata: { name: 'R' },
    configuration: { when_extended: { recurrence_days: ['monday', 'friday', 'xday'], start_at: { time_point: { time: { hour: 7, minute: 5 } } } } },
    ...patch,
  })
  const all = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const result = schedulesOf([
    rule({}),
    rule({ metadata: undefined, configuration: { when_extended: { recurrence_days: all, start_at: { time_point: { time: { hour: 22, minute: 30 } } } } } }),
    rule({ enabled: false }),
    rule({ configuration: undefined }),
    rule({ configuration: { when_extended: { start_at: { time_point: { time: { hour: 1, minute: 1 } } } } } }),
    rule({ configuration: { when_extended: { recurrence_days: ['monday'], start_at: { time_point: { time: { hour: 'x', minute: 1 } } } } } }),
    rule({ configuration: { when_extended: { recurrence_days: ['monday'], start_at: { time_point: { time: { hour: 1, minute: 'x' } } } } } }),
    rule({ configuration: { when_extended: { recurrence_days: ['monday'] } } }),
  ])
  assert.deepEqual(result, [
    { name: 'R', days: ['monday', 'friday', 'xday'], secondOfDay: 25_500, text: 'lundi, vendredi, xday à 07:05' },
    { name: '?', days: all, secondOfDay: 81_000, text: 'tous les jours à 22:30' },
  ])
})

test('localClock : jour et heure à l\'heure locale du fuseau', () => {
  assert.deepEqual(localClock(Date.UTC(2026, 10, 9, 9, 0, 5), 'Europe/Paris'), { weekday: 'monday', secondOfDay: 36_005 })
  assert.deepEqual(localClock(Date.UTC(2026, 10, 9, 23, 0, 0), 'Europe/Paris'), { weekday: 'tuesday', secondOfDay: 0 })
})

// ---- Le journal avec un pont simulé ----

const RULE = {
  enabled: true,
  metadata: { name: 'Eteind tout' },
  configuration: { when_extended: { recurrence_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], start_at: { time_point: { time: { hour: 10, minute: 0 } } } } },
}
const ROUTES: Record<string, unknown[]> = {
  light: [{ id: 'L1', metadata: { name: 'Lampe 1' }, owner: { rid: 'D1' } }, { id: 'L2' }, { id: 'L3', metadata: { name: 'Propre' }, owner: { rid: 'D9' } }],
  scene: [{ id: 'S1', metadata: { name: 'Relax' } }],
  device: [{ id: 'D1', metadata: { name: 'Perruche' } }, { id: 'D2', metadata: { name: 'Dimmer' } }, { id: 'D3' }],
  behavior_instance: [RULE],
}

const bridge = (override: (path: string) => BridgeAnswer | undefined = () => undefined, timezone: unknown = 'Europe/Paris') => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ timezone }))
  const fake = fakeHttpsGet((options) => {
    const path = String(options.path)
    const custom = override(path)
    if (custom) return custom
    if (path === '/eventstream/clip/v2') return { hang: true }
    return { body: JSON.stringify({ data: ROUTES[path.replace('/clip/v2/resource/', '')] }) }
  })
  return { ...fake, fetchMock }
}

const setup = (options: { address?: string; key?: string; schedules?: never; start?: number } = {}) => {
  const db = new DatabaseSync(':memory:')
  const time = clock(options.start ?? Date.UTC(2026, 10, 9, 9, 0, 0))
  const logs: string[] = []
  const hue = createHueLog(db, { address: options.address ?? '192.168.1.2', key: options.key ?? 'cle', log: (m) => void logs.push(m), now: time.now })
  return { db, time, logs, hue }
}

const own = (rid: string) => ({ rid, rtype: 'device' })
const update = (...data: HueStreamItem[]) => ({ type: 'update', data })
const rows = (db: DatabaseSync) => db.prepare('SELECT name, resource, origin, detail, change FROM hue_events ORDER BY id').all() as { name: string; resource: string; origin: string; detail: string; change: string }[]

test('sans adresse ou sans clé, le journal reste inactif', () => {
  for (const options of [{ address: '' }, { key: '' }, { address: 'a b' }]) {
    const { hue, logs } = setup(options)
    hue.start()
    assert.match(logs[0] ?? '', /journal inactif/)
    assert.equal(hue.status().configured, false)
    hue.stop()
  }
})

test('le journal garde les changements, nomme le matériel et devine l\'origine', async () => {
  const { requests } = bridge()
  const { hue, db, time, logs } = setup()
  hue.start()
  await flush()
  await flush()
  assert.equal(hue.status().listening, true)
  assert.match(logs.join('\n'), /1 règle\(s\) à heure fixe, fuseau Europe\/Paris/)
  assert.ok(requests.some((r) => r.options.path === '/clip/v2/resource/behavior_instance'))

  // 10:00 à Paris : la règle « Eteind tout » vient de partir.
  hue.handle(update({ type: 'light', id: 'L1', owner: own('D1'), on: { on: false } }))
  // Une heure plus tard : un appui, puis une lampe dans les secondes qui suivent.
  time.advance(3_600_000)
  hue.handle(update({ type: 'button', id: 'B1', owner: own('D2'), button: { button_report: { event: 'initial_press' } } }))
  time.advance(1000)
  hue.handle(update({ type: 'light', id: 'L2', dimming: { brightness: 50 } }))
  // Une scène (active, puis inactive : pas un ordre), un détecteur, une liaison radio.
  time.advance(60_000)
  hue.handle(update({ type: 'scene', id: 'S1', status: { active: 'static' } }))
  hue.handle(update({ type: 'scene', id: 'S1', status: { active: 'inactive' } }))
  hue.handle(update({ type: 'light', id: 'L3', on: { on: true } }))
  hue.handle(update({ type: 'motion', owner: own('D3'), motion: { motion: true } }, { type: 'motion', owner: own('D3'), motion: { motion: false } }))
  hue.handle(update({ type: 'zigbee_connectivity', owner: own('D1'), status: 'connected' }))
  hue.handle(update({ type: 'zigbee_connectivity', owner: own('D1'), status: 'connectivity_issue' }))
  // Ce qui n'est pas une mise à jour, ou qu'on ne garde pas, est ignoré.
  hue.handle({ type: 'add', data: [{ type: 'light', id: 'L1', on: { on: true } }] })
  hue.handle(update({ type: 'temperature', id: 'T1' }))
  const saved = rows(db)
  assert.deepEqual(
    saved.map((row) => [row.resource, row.name, row.origin]),
    [
      ['light', 'Perruche', 'rule'],
      ['button', 'Dimmer', 'device'],
      ['light', 'L2', 'switch'],
      ['scene', 'Relax', 'unknown'],
      ['light', 'Propre', 'scene'],
      ['motion', 'D3', 'device'],
      ['motion', 'D3', 'device'],
      ['zigbee_connectivity', 'Perruche', 'device'],
      ['zigbee_connectivity', 'Perruche', 'device'],
    ],
  )
  assert.match(saved[2]?.detail ?? '', /appui sur « Dimmer »/)
  assert.match(saved[5]?.detail ?? '', /mouvement détecté/)
  assert.match(saved[6]?.detail ?? '', /fin du mouvement/)
  assert.match(saved[8]?.detail ?? '', /connectivity_issue/)
  assert.equal(hue.status().lastEventAt, new Date(time.now()).toISOString())
  hue.stop()
})

test('list : filtres par origine, nom, période et limite ; le plus récent d\'abord', async () => {
  bridge()
  const { hue, time } = setup()
  hue.start()
  await flush()
  await flush()
  hue.handle(update({ type: 'light', id: 'L1', owner: own('D1'), on: { on: false } }))
  time.advance(3_600_000)
  hue.handle(update({ type: 'button', id: 'B1', owner: own('D2'), button: { button_report: { event: 'initial_press' } } }))
  time.advance(1000)
  hue.handle(update({ type: 'light', id: 'L2', on: { on: true } }))
  const all = hue.list(new URLSearchParams())
  assert.deepEqual(all.entries.map((e) => e.resource), ['light', 'button', 'light'])
  assert.deepEqual(all.entries[0]?.change, { on: true })
  assert.equal(all.entries[0]?.at, new Date(time.now()).toISOString())
  assert.equal(all.status.configured, true)
  assert.deepEqual(hue.list(new URLSearchParams('origin=switch')).entries.map((e) => e.name), ['L2'])
  assert.deepEqual(hue.list(new URLSearchParams('name=PERRU')).entries.map((e) => e.name), ['Perruche'])
  assert.equal(hue.list(new URLSearchParams('limit=1')).entries.length, 1)
  assert.equal(hue.list(new URLSearchParams(`since=${Math.floor(time.now() / 1000)}`)).entries.length, 1)
  hue.stop()
})

test('un nom inconnu recharge les noms, au plus une fois par minute', async () => {
  const { requests } = bridge()
  const { hue, time, db } = setup()
  const lightRequests = () => requests.filter((r) => r.options.path === '/clip/v2/resource/light').length
  hue.handle(update({ type: 'light', id: 'L9', id_v1: '/lights/9', on: { on: true } }))
  await flush()
  await flush()
  assert.equal(lightRequests(), 1)
  hue.handle(update({ type: 'light', id: 'L9', on: { on: false } }))
  assert.equal(lightRequests(), 1)
  time.advance(61_000)
  hue.handle(update({ type: 'light', on: { on: false } }))
  await flush()
  assert.equal(lightRequests(), 2)
  assert.deepEqual(rows(db).map((row) => row.name), ['/lights/9', 'L9', ''])
})

test('une erreur de SQLite sur un événement reste dans le journal', async () => {
  bridge()
  const { hue, db, logs } = setup()
  db.exec("CREATE TRIGGER refuse BEFORE INSERT ON hue_events BEGIN SELECT RAISE(ABORT, 'refusé'); END")
  hue.handle(update({ type: 'light', id: 'L1', on: { on: true } }))
  assert.match(logs.join('\n'), /événement ignoré \(refusé\)/)
  await flush()
})

test('les noms et les règles qui ne se rechargent pas laissent une trace', async () => {
  const failures: Record<string, BridgeAnswer> = {
    '/clip/v2/resource/light': { status: 500 },
    '/clip/v2/resource/scene': { body: 'pas du json' },
    '/clip/v2/resource/device': { timeout: true },
    '/clip/v2/resource/behavior_instance': { error: 'coupé' },
  }
  const { fetchMock } = bridge((path) => failures[path])
  fetchMock.mock.mockImplementation(async () => {
    throw 'chaîne'
  })
  const { hue, logs } = setup()
  hue.start()
  await flush()
  await flush()
  assert.match(logs.join('\n'), /noms non rechargés/)
  assert.match(logs.join('\n'), /règles à heure fixe non rechargées \(coupé\)/)
  hue.stop()
})

test('chaque cause d\'échec du pont est rapportée', async () => {
  const cases: [BridgeAnswer, RegExp][] = [
    [{ status: 500 }, /HTTP 500/],
    [{ body: 'pas du json' }, /JSON/],
    [{ timeout: true }, /délai dépassé/],
    [{ error: 'refusé' }, /refusé/],
    [{ body: 'x'.repeat(5_000_001) }, /trop grosse|JSON/],
  ]
  for (const [answer, pattern] of cases) {
    mock.restoreAll()
    bridge((path) => (path === '/eventstream/clip/v2' ? undefined : answer))
    const { hue, logs } = setup()
    hue.handle(update({ type: 'light', id: 'L1', on: { on: true } }))
    await flush()
    await flush()
    assert.match(logs.join('\n'), pattern)
    hue.stop()
  }
})

test('le fuseau du pont : gardé s\'il manque, refusé s\'il est invalide, et le fuseau déjà connu reste', async () => {
  bridge(() => undefined, 42)
  const first = setup()
  first.hue.start()
  await flush()
  await flush()
  assert.match(first.logs.join('\n'), /fuseau UTC/)
  first.hue.stop()
  mock.restoreAll()
  bridge(() => undefined, 'Pas/UnFuseau')
  const second = setup()
  second.hue.start()
  await flush()
  await flush()
  assert.match(second.logs.join('\n'), /règles à heure fixe non rechargées/)
  second.hue.stop()
})

test('les rechargements reviennent à l\'heure ; stop arrête tout', async () => {
  mock.timers.enable({ apis: ['setInterval'] })
  const { requests } = bridge()
  const { hue, db, time } = setup()
  db.exec('SELECT 1')
  hue.start()
  await flush()
  await flush()
  const before = requests.length
  time.advance(3 * 86_400_000)
  mock.timers.tick(10 * 60_000)
  await flush()
  await flush()
  assert.ok(requests.length > before)
  hue.stop()
  const after = requests.length
  mock.timers.tick(86_400_000)
  assert.equal(requests.length, after)
})

test('purgeHueLog retire les lignes plus vieilles que la limite et les compte', () => {
  bridge()
  const { hue, db, time } = setup()
  hue.handle(update({ type: 'light', id: 'L1', on: { on: true } }))
  time.advance(3 * 86_400_000)
  hue.handle(update({ type: 'light', id: 'L1', on: { on: false } }))
  assert.equal(purgeHueLog(db, Math.floor(time.now() / 1000) - 86_400), 1)
  assert.equal(rows(db).length, 1)
  assert.equal(purgeHueLog(db, Math.floor(time.now() / 1000) - 86_400), 0)
})

test('stop avant start ne casse rien', () => {
  bridge()
  const { hue } = setup()
  hue.stop()
})

test('localClock : un morceau de date absent donne zéro', (t) => {
  t.mock.method(Intl.DateTimeFormat.prototype, 'formatToParts', () => [])
  assert.deepEqual(localClock(0, 'UTC'), { weekday: '', secondOfDay: 0 })
})

test('les valeurs par défaut : horloge réelle', () => {
  const db = new DatabaseSync(':memory:')
  const hue = createHueLog(db, { address: '', key: '', log: () => undefined })
  assert.equal(hue.status().configured, false)
  hue.handle(update({ type: 'zigbee_connectivity', owner: own('D1'), status: 'connected' }))
  assert.equal(rows(db).length, 1)
})

test('les erreurs qui ne sont pas des Error sont mises en texte', async () => {
  const { fetchMock } = bridge((path) => (path.endsWith('/light') ? { rawError: 'texte brut' } : undefined))
  fetchMock.mock.mockImplementation(async () => {
    throw 'fetch brut'
  })
  const { hue, logs } = setup()
  hue.start()
  await flush()
  await flush()
  assert.match(logs.join('\n'), /noms non rechargés \(texte brut\)/)
  assert.match(logs.join('\n'), /non rechargées \(fetch brut\)/)
  hue.stop()
})

test('une scène ou un détecteur sans identifiant ni propriétaire est gardé quand même', () => {
  bridge()
  const { hue, db } = setup()
  hue.handle(update({ type: 'scene', status: { active: 'static' } }, { type: 'motion', motion: { motion: true } }))
  assert.deepEqual(rows(db).map((row) => row.resource), ['scene', 'motion'])
})

test('un échec de SQLite qui n\'est pas une Error est mis en texte à l\'écriture', () => {
  bridge()
  const db = new DatabaseSync(':memory:')
  const logs: string[] = []
  const failing = new Proxy(db, {
    get: (target, property) => {
      if (property === 'prepare')
        return (sql: string) => (/^(INSERT|DELETE)/.test(sql) ? { run: () => { throw 'sqlite brut' } } : target.prepare(sql))
      const value = Reflect.get(target, property) as unknown
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value
    },
  })
  const hue = createHueLog(failing, { address: '192.168.1.2', key: 'cle', log: (m) => void logs.push(m) })
  hue.handle(update({ type: 'light', id: 'L1', on: { on: true } }))
  assert.match(logs.join('\n'), /événement ignoré \(sqlite brut\)/)
})
