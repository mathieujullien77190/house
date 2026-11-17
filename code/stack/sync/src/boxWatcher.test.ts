import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'
import { writeFileSync } from 'node:fs'
import { afterEach, mock, test } from 'node:test'
import { createBoxTables, createBoxWatcher, migrateBoxFiles, normalizeMac, parseBoxDevices, type BoxDevice } from './boxWatcher.ts'
import { testContext } from './testing.ts'

afterEach(() => {
  mock.restoreAll()
  syncBuiltinESMExports()
})

const TARGET = { url: 'https://api:8080', key: 'k', ca: '', servername: 'localhost' }
const MAC = (n: number) => `AA:BB:CC:DD:EE:0${n}`

const device = (n: number, patch: Partial<BoxDevice> = {}): BoxDevice => ({ mac: MAC(n), name: `Appareil ${n}`, ip: `192.168.1.${n}`, active: true, type: null, vendor: null, ...patch })

const rows = (ctx: ReturnType<typeof testContext>, table: string) => ctx.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().map((row) => ({ ...row }))

test('normalizeMac : majuscules séparées par deux-points, ou null', () => {
  assert.equal(normalizeMac('aa-bb-cc-dd-ee-01'), MAC(1))
  assert.equal(normalizeMac(' aabbccddee01 '), MAC(1))
  assert.equal(normalizeMac('x'), null)
  assert.equal(normalizeMac(4), null)
})

test('parseBoxDevices : les appareils de GET /box, les MAC fausses écartées, null sans liste', () => {
  assert.equal(parseBoxDevices(null), null)
  assert.equal(parseBoxDevices({ devices: 'non' }), null)
  assert.deepEqual(
    parseBoxDevices({
      devices: [
        { mac: 'aa:bb:cc:dd:ee:01', name: 'TV', ip: '192.168.1.2', active: true, type: 'tv', vendor: 'Samsung' },
        { mac: 'aa:bb:cc:dd:ee:02', active: 'oui' },
        { mac: 'pas une mac', name: 'x' },
        null,
      ],
    }),
    [
      { mac: MAC(1), name: 'TV', ip: '192.168.1.2', active: true, type: 'tv', vendor: 'Samsung' },
      { mac: MAC(2), name: MAC(2), ip: null, active: false, type: null, vendor: null },
    ],
  )
})

test('createBoxTables : sans erreur une seconde fois', () => {
  const ctx = testContext()
  assert.doesNotThrow(() => createBoxTables(ctx.db))
})

test('migrateBoxFiles : reprend les anciens fichiers une seule fois, seulement si les tables sont vides', () => {
  const ctx = testContext()
  const known = `${ctx.dir}/known.json`
  const guests = `${ctx.dir}/guests.json`
  assert.equal(migrateBoxFiles(ctx.db, known, guests), 0)
  writeFileSync(known, JSON.stringify([{ mac: 'aa:bb:cc:dd:ee:01', name: 'TV', ip: '192.168.1.2' }, { mac: 'x' }, { mac: MAC(3) }]))
  writeFileSync(
    guests,
    JSON.stringify([
      { mac: MAC(4), name: 'Tel', ip: '192.168.1.4', type: 'phone', vendor: 'Apple', firstSeen: 10.5, lastSeen: 20 },
      { mac: MAC(5), firstSeen: 7 },
      { mac: MAC(6), lastSeen: 7 },
      { mac: 'x', firstSeen: 1 },
    ]),
  )
  assert.equal(migrateBoxFiles(ctx.db, known, guests), 4)
  assert.deepEqual(rows(ctx, 'box_known'), [
    { mac: MAC(1), name: 'TV', ip: '192.168.1.2' },
    { mac: MAC(3), name: MAC(3), ip: null },
  ])
  assert.deepEqual(
    rows(ctx, 'box_guests').map((row) => [row.mac, row.name, row.first_seen, row.last_seen]),
    [
      [MAC(4), 'Tel', 10, 20],
      [MAC(5), MAC(5), 7, 7],
    ],
  )
  // les tables ont des lignes : les fichiers ne sont plus lus
  writeFileSync(known, JSON.stringify([{ mac: MAC(9) }]))
  assert.equal(migrateBoxFiles(ctx.db, known, guests), 0)
})

test('migrateBoxFiles : un fichier abîmé ou qui n’est pas une liste ne reprend rien', () => {
  const ctx = testContext()
  const known = `${ctx.dir}/known.json`
  const guests = `${ctx.dir}/guests.json`
  writeFileSync(known, '{abîmé')
  writeFileSync(guests, '{"a":1}')
  assert.equal(migrateBoxFiles(ctx.db, known, guests), 0)
})

test('poll : sans cible, rien ; une lecture qui échoue est dite une fois et ne change rien', async () => {
  const ctx = testContext()
  let failure: Error | string = new Error('box muette')
  const fetchDevices = async (): Promise<BoxDevice[]> => {
    throw failure
  }
  assert.equal(await createBoxWatcher(ctx, () => null, fetchDevices).poll(), 0)
  assert.deepEqual(ctx.logs, [])
  const watcher = createBoxWatcher(ctx, () => TARGET, fetchDevices)
  assert.equal(await watcher.poll(), 0)
  assert.equal(await watcher.poll(), 0)
  failure = 'texte'
  assert.equal(await watcher.poll(), 0)
  assert.deepEqual(ctx.logs, ['Box : lecture sautée (box muette)', 'Box : lecture sautée (texte)'])
  assert.deepEqual(rows(ctx, 'box_known'), [])
})

test('poll : la photo de la maison au premier tour, puis les connexions et déconnexions des invités', async () => {
  const ctx = testContext()
  let devices: BoxDevice[] = []
  const watcher = createBoxWatcher(ctx, () => TARGET, async () => devices)
  // personne d'actif : pas de photo
  devices = [device(1, { active: false })]
  assert.equal(await watcher.poll(), 0)
  assert.deepEqual(rows(ctx, 'box_known'), [])
  // la maison : les deux appareils actifs
  devices = [device(1), device(2)]
  assert.equal(await watcher.poll(), 0)
  assert.deepEqual(
    rows(ctx, 'box_known').map((row) => row.mac),
    [MAC(1), MAC(2)],
  )
  // un invité arrive
  ctx.time.advance(15_000)
  devices = [device(1), device(2), device(3, { type: 'phone', vendor: 'Apple' })]
  assert.equal(await watcher.poll(), 1)
  assert.deepEqual(
    rows(ctx, 'box_connections').map((row) => [row.event, row.mac, row.type]),
    [['connect', MAC(3), 'phone']],
  )
  assert.equal(rows(ctx, 'box_guests').length, 1)
  // un appareil déjà présent n'est pas noté deux fois
  assert.equal(await watcher.poll(), 0)
  // l'invité part
  ctx.time.advance(15_000)
  devices = [device(1), device(2), device(3, { active: false })]
  assert.equal(await watcher.poll(), 1)
  // il reste dans la liste des invités, hors ligne
  assert.equal(rows(ctx, 'box_guests').length, 1)
  assert.deepEqual(
    rows(ctx, 'box_connections').map((row) => row.event),
    ['connect', 'disconnect'],
  )
  // il revient puis disparaît de la réponse de la box
  ctx.time.advance(15_000)
  devices = [device(1), device(2), device(3)]
  assert.equal(await watcher.poll(), 1)
  ctx.time.advance(15_000)
  devices = [device(1), device(2)]
  assert.equal(await watcher.poll(), 1)
  assert.equal(rows(ctx, 'box_connections').length, 4)
})

test('poll : un invité déjà connecté au démarrage entre sans note ; un invité qui entre dans la maison n’est pas noté parti', async () => {
  const ctx = testContext()
  ctx.db.prepare("INSERT INTO box_known (mac, name, ip) VALUES (?, 'TV', NULL)").run(MAC(1))
  let devices = [device(1), device(3)]
  const watcher = createBoxWatcher(ctx, () => TARGET, async () => devices)
  assert.equal(await watcher.poll(), 0)
  assert.equal(rows(ctx, 'box_guests').length, 1)
  assert.equal(rows(ctx, 'box_connections').length, 0)
  // l'utilisateur l'ajoute à la maison (l'API écrit), puis il n'est plus actif : ni connexion, ni déconnexion
  ctx.db.prepare("INSERT INTO box_known (mac, name, ip) VALUES (?, 'Tel', NULL)").run(MAC(3))
  devices = [device(1)]
  assert.equal(await watcher.poll(), 0)
  assert.equal(rows(ctx, 'box_connections').length, 0)
})

test('poll : par défaut, la box est lue chez House API (GET /box)', async () => {
  const ctx = testContext()
  const calls: unknown[][] = []
  mock.method(https, 'request', (...args: unknown[]) => {
    calls.push(args)
    const callback = args[2] as (res: EventEmitter & { statusCode: number; setEncoding: () => void }) => void
    const req = Object.assign(new EventEmitter(), {
      destroy: () => undefined,
      end: () => {
        const res = Object.assign(new EventEmitter(), { statusCode: 200, setEncoding: () => undefined })
        callback(res)
        res.emit('data', JSON.stringify({ devices: [{ mac: MAC(1), name: 'TV', active: true }] }))
        res.emit('end')
      },
    })
    return req
  })
  syncBuiltinESMExports()
  assert.equal(await createBoxWatcher(ctx, () => TARGET).poll(), 0)
  assert.equal(calls[0]?.[0], 'https://api:8080/box')
  assert.deepEqual(
    rows(ctx, 'box_known').map((row) => row.mac),
    [MAC(1)],
  )
})
