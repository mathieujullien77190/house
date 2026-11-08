// Tests des filtres de la page de House Sync (tables et clips) : node --test.
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import {
  clipCameras,
  clipEventId,
  clipFilterParams,
  clipStart,
  filterClips,
  filterParams,
  readTable,
  summarizeTables,
  type ClipGroup,
} from './data.ts'

const database = () => {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE events (id TEXT PRIMARY KEY, camera TEXT NOT NULL, started_at INTEGER NOT NULL);
    CREATE TABLE last_images (camera TEXT PRIMARY KEY, url TEXT);
    CREATE TABLE live_streams (camera TEXT PRIMARY KEY, url TEXT);
    CREATE TABLE snapshots (camera TEXT NOT NULL, taken_at INTEGER NOT NULL, path TEXT);
    CREATE TABLE hue_events (id INTEGER PRIMARY KEY, happened_at INTEGER NOT NULL, happened_ms INTEGER NOT NULL, name TEXT, resource TEXT);
    CREATE TABLE merges (absorbed_id TEXT, kept_id TEXT, camera TEXT, absorbed_started_at INTEGER, merged_at INTEGER);
    CREATE TABLE settings (camera TEXT PRIMARY KEY);
    CREATE TABLE guest_visits (id INTEGER PRIMARY KEY, started_at INTEGER NOT NULL, camera TEXT, cle TEXT);
    CREATE TABLE plan (kind TEXT NOT NULL, id TEXT NOT NULL, x REAL, y REAL, data TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (kind, id));
  `)
  const insert = db.prepare('INSERT INTO events (id, camera, started_at) VALUES (?, ?, ?)')
  insert.run('a', 'voliere-interieur', 1000)
  insert.run('b', 'voliere-exterieur', 2000)
  insert.run('c', 'voliere-interieur', 3000)
  const hue = db.prepare('INSERT INTO hue_events (happened_at, happened_ms, name, resource) VALUES (?, ?, ?, ?)')
  hue.run(1000, 1000000, 'Perruche', 'light')
  hue.run(2000, 2000000, 'motion interieur', 'motion')
  hue.run(3000, 3000000, 'Perruche', 'light')
  hue.run(4000, 4000000, 'Interrupteur salon', 'zigbee_connectivity')
  return db
}

test('filterParams : une valeur et une période, le reste est ignoré', () => {
  assert.deepEqual(filterParams(new URLSearchParams('match=Perruche&from=10&to=20')), { match: 'Perruche', from: 10, to: 20 })
  assert.deepEqual(filterParams(new URLSearchParams('match=&from=abc&to=')), { match: undefined, from: undefined, to: undefined })
  assert.equal(filterParams(new URLSearchParams(`match=${'x'.repeat(101)}`)).match, undefined)
})

test('readTable filtre par caméra et par période, et rend les valeurs du filtre', () => {
  const db = database()
  const all = readTable(db, 'events', 0, 20)
  assert.equal(all?.total, 3)
  assert.deepEqual(all?.options, ['voliere-exterieur', 'voliere-interieur'])
  assert.equal(readTable(db, 'events', 0, 20, { match: 'voliere-interieur' })?.total, 2)
  assert.deepEqual(
    readTable(db, 'events', 0, 20, { from: 1500, to: 3000 })?.items.map((row) => row.id),
    ['b'],
  )
  assert.equal(readTable(db, 'events', 0, 20, { match: 'voliere-interieur', from: 2500 })?.total, 1)
  // Le plus récent d'abord, et la pagination suit le filtre.
  assert.deepEqual(
    readTable(db, 'events', 0, 1, { match: 'voliere-interieur' })?.items.map((row) => row.id),
    ['c'],
  )
})

test('hue_events se filtre par nom du matériel et par date ; guest_visits par clé et par date', () => {
  const db = database()
  assert.equal(readTable(db, 'hue_events', 0, 20, { match: 'Perruche' })?.total, 2)
  assert.deepEqual(readTable(db, 'hue_events', 0, 20)?.options, ['Perruche', 'motion interieur'])
  assert.equal(readTable(db, 'hue_events', 0, 20, { from: 1500, to: 2500 })?.total, 1)
  db.exec("INSERT INTO guest_visits (started_at, cle) VALUES (10, 'avec clé'), (20, 'sans clé'), (30, 'avec clé')")
  assert.equal(readTable(db, 'guest_visits', 0, 20, { match: 'avec clé' })?.total, 2)
  assert.deepEqual(readTable(db, 'guest_visits', 0, 20)?.options, ['avec clé', 'sans clé'])
})

test("une table sans filtre ignore ceux qu'on lui donne ; summarizeTables dit ce que chaque table filtre", () => {
  const db = database()
  assert.equal(readTable(db, 'settings', 0, 20, { match: 'x', from: 1, to: 2 })?.total, 0)
  const tables = Object.fromEntries(summarizeTables(db).map((table) => [table.name, table.filters]))
  assert.deepEqual(tables.events, { match: 'camera', date: true })
  assert.deepEqual(tables.hue_events, { match: 'name', date: true })
  assert.deepEqual(tables.guest_visits, { match: 'cle', date: true })
  assert.deepEqual(tables.settings, { match: null, date: false })
})

test('un nom de colonne ne vient jamais de la demande : une valeur piégée reste une valeur', () => {
  const db = database()
  assert.equal(readTable(db, 'events', 0, 20, { match: "x' OR '1'='1" })?.total, 0)
})

const clip = (id: string): ClipGroup => ({ id, original: null, light: null, modifiedMs: 0 })
const CLIPS = [
  clip('clips/voliere-interieur/3000.5-voliere-interieur'),
  clip('clips/voliere-exterieur/2000.1-voliere-exterieur'),
  clip('clips/voliere-interieur/1000.9-voliere-interieur'),
]

test('un clip dit sa caméra, son début et son événement', () => {
  assert.equal(clipStart(CLIPS[0].id), 3000)
  assert.equal(clipEventId(CLIPS[1].id), '2000.1-voliere-exterieur')
  assert.equal(clipStart('clips/x/pas-un-clip'), null)
  assert.deepEqual(clipCameras(CLIPS), ['voliere-exterieur', 'voliere-interieur'])
})

test('filterClips : caméra, période, sauvegardés ou non', () => {
  assert.equal(filterClips(CLIPS, { camera: 'voliere-interieur' }).length, 2)
  assert.equal(filterClips(CLIPS, { from: 1500, to: 3000 }).length, 1)
  const ids = new Set(['2000.1-voliere-exterieur'])
  assert.deepEqual(
    filterClips(CLIPS, { saved: { ids, keep: true } }).map((group) => clipEventId(group.id)),
    ['2000.1-voliere-exterieur'],
  )
  assert.equal(filterClips(CLIPS, { saved: { ids, keep: false } }).length, 2)
  assert.equal(filterClips(CLIPS, { camera: 'voliere-interieur', saved: { ids, keep: true } }).length, 0)
})

test('clipFilterParams : sauvegardés (1), les autres (0), tous (absent) ; une caméra invalide est ignorée', () => {
  assert.equal(clipFilterParams(new URLSearchParams('saved=1')).saved, 'saved')
  assert.equal(clipFilterParams(new URLSearchParams('saved=0')).saved, 'others')
  assert.equal(clipFilterParams(new URLSearchParams()).saved, null)
  assert.equal(clipFilterParams(new URLSearchParams('camera=../etc')).camera, undefined)
  assert.equal(clipFilterParams(new URLSearchParams('camera=voliere-interieur&from=5')).camera, 'voliere-interieur')
})

test('la table plan se lit, triée par genre et identifiant, sans filtre', () => {
  const db = new DatabaseSync(':memory:')
  db.exec(
    `CREATE TABLE plan (kind TEXT NOT NULL, id TEXT NOT NULL, x REAL, y REAL, data TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (kind, id))`,
  )
  db.exec(`INSERT INTO plan VALUES ('arbre', 't2', 1, 2, '{}', 1), ('arbre', 't1', 3, 4, '{}', 1), ('cage', 'cage', 5, 6, '{}', 1)`)
  const all = readTable(db, 'plan', 0, 10)
  assert.deepEqual(
    all?.items.map((row) => `${row.kind}:${row.id}`),
    ['arbre:t1', 'arbre:t2', 'cage:cage'],
  )
})
