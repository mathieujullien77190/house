// Tests des filtres de la page de House Sync (tables et clips) : node --test.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import {
  clipCamera,
  clipCameras,
  clipEventId,
  clipFilterParams,
  clipStart,
  filterClips,
  filterParams,
  groupClips,
  listBackup,
  pageParams,
  paginate,
  readDiskSpace,
  readTable,
  summarizeTables,
  sumSize,
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
    CREATE TABLE heating_log (id INTEGER PRIMARY KEY, started_at INTEGER NOT NULL, origin TEXT, minutes INTEGER, cost REAL);
    CREATE TABLE plan (kind TEXT NOT NULL, id TEXT NOT NULL, longitude REAL, latitude REAL, data TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (kind, id));
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

test('une table inconnue ne se lit pas ; chaque table a son ordre naturel', () => {
  const db = database()
  assert.equal(readTable(db, 'inconnue', 0, 20), null)
  db.exec("INSERT INTO merges (absorbed_id, kept_id, camera, absorbed_started_at, merged_at) VALUES ('x', 'y', 'cam', 5, 7), ('z', 'y', 'cam', 9, 7)")
  assert.deepEqual(readTable(db, 'merges', 0, 20)?.items.map((row) => row.absorbed_id), ['z', 'x'])
  db.exec("INSERT INTO snapshots VALUES ('cam', 5, 'a'), ('cam', 9, 'b')")
  assert.deepEqual(readTable(db, 'snapshots', 0, 20)?.items.map((row) => row.path), ['b', 'a'])
  db.exec("INSERT INTO last_images VALUES ('b', 'u'), ('a', 'u')")
  assert.deepEqual(readTable(db, 'last_images', 0, 20)?.items.map((row) => row.camera), ['a', 'b'])
  // Le journal Hue cache happened_ms et trie par lui.
  assert.deepEqual(readTable(db, 'hue_events', 0, 1)?.items[0]?.happened_at, 4000)
  assert.equal('happened_ms' in (readTable(db, 'hue_events', 0, 1)?.items[0] ?? {}), false)
})

test('clipCamera : la caméra du chemin, ou null', () => {
  assert.equal(clipCamera('clips/voliere-interieur/1-x'), 'voliere-interieur')
  assert.equal(clipCamera('autre'), null)
})

test('listBackup : les fichiers du disque, du plus récent au plus ancien, sans la base ni son journal', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-backup-'))
  try {
    mkdirSync(`${dir}/clips/cam`, { recursive: true })
    mkdirSync(`${dir}/snapshots/cam`, { recursive: true })
    writeFileSync(`${dir}/clips/cam/old.mp4`, 'aaaa')
    writeFileSync(`${dir}/clips/cam/new.h264.mp4`, 'bb')
    writeFileSync(`${dir}/snapshots/cam/1.jpg`, 'c')
    writeFileSync(`${dir}/events.db`, 'x')
    writeFileSync(`${dir}/events.db-journal`, 'x')
    writeFileSync(`${dir}/events.db.pre-orientation-2026`, 'x')
    writeFileSync(`${dir}/autre-journal-journal`, 'x')
    utimesSync(`${dir}/clips/cam/old.mp4`, 1000, 1000)
    utimesSync(`${dir}/clips/cam/new.h264.mp4`, 3000, 3000)
    utimesSync(`${dir}/snapshots/cam/1.jpg`, 2000, 2000)
    const files = await listBackup(dir)
    assert.deepEqual(files.map((file) => file.path), ['clips/cam/new.h264.mp4', 'snapshots/cam/1.jpg', 'clips/cam/old.mp4'])
    assert.equal(sumSize(files), 7)
    assert.deepEqual(await listBackup(`${dir}/absent`), [])
    const groups = groupClips(files.filter((file) => file.path.startsWith('clips/')))
    assert.deepEqual(groups.map((group) => group.id), ['clips/cam/new', 'clips/cam/old'])
    assert.equal(groups[0]?.light?.size, 2)
    assert.equal(groups[1]?.original?.size, 4)
    // Les deux versions d'un même clip se réunissent, la plus récente date le groupe.
    writeFileSync(`${dir}/clips/cam/new.mp4`, 'dddd')
    utimesSync(`${dir}/clips/cam/new.mp4`, 500, 500)
    const merged = groupClips((await listBackup(dir)).filter((file) => file.path.startsWith('clips/')))
    assert.equal(merged.length, 2)
    assert.equal(merged[0]?.original?.size, 4)
    assert.equal(merged[0]?.light?.size, 2)
    assert.equal(merged[0]?.modifiedMs, 3_000_000)
    // La place du disque : un dossier réel, puis un dossier absent.
    const space = await readDiskSpace(dir)
    assert.ok(space.total > 0 && space.free >= 0 && space.reserved >= 0)
    assert.deepEqual(await readDiskSpace(`${dir}/absent`), { total: 0, free: 0, reserved: 0 })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('paginate et pageParams : pages bornées', () => {
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 1, 2), { items: [3, 4], total: 5, page: 1, size: 2 })
  assert.deepEqual(pageParams(new URLSearchParams()), { page: 0, size: 20 })
  assert.deepEqual(pageParams(new URLSearchParams('page=3&size=50')), { page: 3, size: 50 })
  assert.deepEqual(pageParams(new URLSearchParams('page=-2&size=1000')), { page: 0, size: 100 })
  assert.deepEqual(pageParams(new URLSearchParams('page=x&size=0')), { page: 0, size: 20 })
})
