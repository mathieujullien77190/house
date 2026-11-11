// Tests de la création de la base, de ses colonnes ajoutées et de la migration des orientations.
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { addColumn, initDatabase } from './database.ts'
import { tempDir } from './testing.ts'

const NOW = Date.UTC(2026, 10, 9, 12, 0, 0)
const quiet = (action: () => void): string[] => {
  const lines: string[] = []
  const original = console.log
  console.log = (line: string) => void lines.push(line)
  try {
    action()
  } finally {
    console.log = original
  }
  return lines
}
const columns = (db: DatabaseSync, table: string) => (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)

test('addColumn n\'ajoute une colonne qu\'une fois', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE t (a TEXT)')
  addColumn(db, 't', 'b', 'INTEGER')
  addColumn(db, 't', 'b', 'INTEGER')
  assert.deepEqual(columns(db, 't'), ['a', 'b'])
})

test('une base neuve : toutes les tables et colonnes, migration faite une seule fois avec sa copie', () => {
  const dir = tempDir()
  const db = new DatabaseSync(':memory:')
  const lines = quiet(() => initDatabase(db, dir, () => NOW))
  assert.match(lines[0] ?? '', /Orientation : événements étiquetés/)
  for (const table of ['events', 'last_images', 'live_streams', 'snapshots', 'settings', 'merges', 'app_settings']) assert.ok(columns(db, table).length > 0, table)
  assert.ok(columns(db, 'snapshots').includes('code'))
  assert.ok(columns(db, 'events').includes('clip_audio_path'))
  assert.ok(columns(db, 'settings').includes('motion_sensitivity'))
  assert.deepEqual(readdirSync(dir), ['events.db.pre-orientation-2026-11-09T12-00-00-000Z'])
  assert.deepEqual(quiet(() => initDatabase(db, dir, () => NOW)), [])
  assert.equal(readdirSync(dir).length, 1)
})

test('une base d\'avant : les événements et les réglages reçoivent leur orientation', () => {
  const dir = tempDir()
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE events (id TEXT PRIMARY KEY, camera TEXT NOT NULL, label TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER);
    CREATE TABLE settings (camera TEXT PRIMARY KEY, clips_enabled INTEGER NOT NULL DEFAULT 1, snapshot_seconds INTEGER NOT NULL);
  `)
  const turnedAt = Date.UTC(2026, 10, 8, 10, 0, 0) / 1000
  db.prepare('INSERT INTO events (id, camera, label, started_at) VALUES (?, ?, ?, ?)').run('avant', 'voliere-exterieur', 'x', turnedAt - 1)
  db.prepare('INSERT INTO events (id, camera, label, started_at) VALUES (?, ?, ?, ?)').run('apres', 'voliere-exterieur', 'x', turnedAt)
  db.prepare('INSERT INTO events (id, camera, label, started_at) VALUES (?, ?, ?, ?)').run('autre', 'voliere-interieur', 'x', turnedAt + 10)
  db.exec("INSERT INTO settings (camera, snapshot_seconds) VALUES ('voliere-exterieur', 60), ('voliere-interieur', 60)")
  quiet(() => initDatabase(db, dir, () => NOW))
  const orientation = (id: string) => (db.prepare('SELECT orientation FROM events WHERE id = ?').get(id) as { orientation: string }).orientation
  assert.deepEqual([orientation('avant'), orientation('apres'), orientation('autre')], ['landscape', 'portrait', 'landscape'])
  const settings = db.prepare('SELECT camera, orientation FROM settings ORDER BY camera').all() as { camera: string; orientation: string }[]
  assert.deepEqual(settings.map((row) => row.orientation), ['portrait', 'landscape'])
})

test('le déclencheur donne à un nouvel événement l\'orientation de sa caméra, paysage par défaut', () => {
  const db = new DatabaseSync(':memory:')
  quiet(() => initDatabase(db, tempDir(), () => NOW))
  db.exec("INSERT INTO settings (camera, snapshot_seconds, orientation) VALUES ('tournee', 60, 'portrait')")
  const insert = db.prepare('INSERT INTO events (id, camera, label, started_at, orientation) VALUES (?, ?, ?, ?, ?)')
  insert.run('a', 'tournee', 'x', 1, null)
  insert.run('b', 'inconnue', 'x', 1, null)
  insert.run('c', 'tournee', 'x', 1, 'landscape')
  const read = (id: string) => (db.prepare('SELECT orientation FROM events WHERE id = ?').get(id) as { orientation: string }).orientation
  assert.deepEqual([read('a'), read('b'), read('c')], ['portrait', 'landscape', 'landscape'])
})

test('les yeux qui brillent : l’ancienne valeur « night » devient « on » à l’ouverture, « off » reste', () => {
  const db = new DatabaseSync(':memory:')
  quiet(() => initDatabase(db, tempDir(), () => NOW))
  db.exec("INSERT INTO settings (camera, snapshot_seconds, eyes_mode) VALUES ('a', 60, 'night'), ('b', 60, 'off'), ('c', 60, NULL)")
  quiet(() => initDatabase(db, tempDir(), () => NOW))
  const modes = db.prepare('SELECT camera, eyes_mode FROM settings ORDER BY camera').all().map((row) => ({ ...row }))
  assert.deepEqual(modes, [{ camera: 'a', eyes_mode: 'on' }, { camera: 'b', eyes_mode: 'off' }, { camera: 'c', eyes_mode: null }])
})

test('une base d’avant les codes : la colonne est ajoutée et les images reçoivent leur code, une seule fois', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE snapshots (camera TEXT NOT NULL, taken_at INTEGER NOT NULL, path TEXT NOT NULL, PRIMARY KEY (camera, taken_at))')
  db.exec("INSERT INTO snapshots VALUES ('voliere-exterieur', 2, 'b'), ('voliere-exterieur', 1, 'a')")
  const lines = quiet(() => initDatabase(db, tempDir(), () => NOW))
  assert.ok(lines.includes('Images : 2 codes attribués'))
  assert.deepEqual(db.prepare('SELECT taken_at, code FROM snapshots ORDER BY taken_at').all().map((row) => ({ ...row })), [{ taken_at: 1, code: 'ba' }, { taken_at: 2, code: 'bb' }])
  assert.deepEqual(quiet(() => initDatabase(db, tempDir(), () => NOW)), [])
})
