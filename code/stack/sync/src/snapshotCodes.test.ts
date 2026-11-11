// Tests des codes permanents des images gardées : les lettres, l'attribution à l'ajout, le rattrapage des images d'avant et l'absence de réutilisation.
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { backfillSnapshotCodes, cameraIndexOf, codeOf, insertSnapshot, letters } from './snapshotCodes.ts'

const setup = (): DatabaseSync => {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE snapshots (camera TEXT NOT NULL, taken_at INTEGER NOT NULL, path TEXT NOT NULL, code TEXT, PRIMARY KEY (camera, taken_at));
    CREATE UNIQUE INDEX snapshots_code ON snapshots (code);
    CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
  return db
}
const codes = (db: DatabaseSync): string[] => (db.prepare('SELECT camera, taken_at, code FROM snapshots ORDER BY camera, taken_at').all() as { camera: string; code: string }[]).map((row) => `${row.camera}:${row.code}`)
const setting = (db: DatabaseSync, key: string): string | undefined => (db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined)?.value

test('letters : le moins de lettres possible, de a à z puis aa, ab…', () => {
  assert.deepEqual([1, 2, 26, 27, 28, 52, 53, 702, 703].map(letters), ['a', 'b', 'z', 'aa', 'ab', 'az', 'ba', 'zz', 'aaa'])
  assert.equal(letters(0), '')
})

test('codeOf : la lettre de la caméra puis le numéro en lettres', () => {
  assert.equal(codeOf(0, 1), 'aa')
  assert.equal(codeOf(1, 2), 'bb')
  assert.equal(codeOf(3, 1), 'da')
  assert.equal(codeOf(3, 27), 'daa')
  assert.equal(codeOf(3, 702), 'dzz')
  assert.equal(codeOf(3, 703), 'daaa')
})

test('cameraIndexOf : l’ordre d’arrivée, puis les autres caméras à la suite, une fois pour toutes', () => {
  const db = setup()
  assert.deepEqual(['voliere-interieur', 'voliere-exterieur', 'salon-de-jardin', 'voliere-toit'].map((camera) => cameraIndexOf(db, camera)), [0, 1, 2, 3])
  assert.equal(cameraIndexOf(db, 'zebre'), 4)
  assert.equal(cameraIndexOf(db, 'abeille'), 5)
  assert.equal(cameraIndexOf(db, 'zebre'), 4)
})

test('insertSnapshot : un numéro par image, aucun pour un doublon', () => {
  const db = setup()
  assert.equal(insertSnapshot(db, 'voliere-toit', 100, 'p/100.jpg'), true)
  assert.equal(insertSnapshot(db, 'voliere-toit', 100, 'p/100.jpg'), false)
  assert.equal(insertSnapshot(db, 'voliere-toit', 160, 'p/160.jpg'), true)
  assert.equal(insertSnapshot(db, 'voliere-interieur', 100, 'q/100.jpg'), true)
  assert.deepEqual(codes(db), ['voliere-interieur:aa', 'voliere-toit:da', 'voliere-toit:db'])
  assert.equal(setting(db, 'snapshot_seq_voliere-toit'), '2')
})

test('insertSnapshot : le numéro monte après le ménage, un code n’est jamais réutilisé', () => {
  const db = setup()
  insertSnapshot(db, 'voliere-toit', 100, 'a')
  insertSnapshot(db, 'voliere-toit', 160, 'b')
  db.exec('DELETE FROM snapshots')
  insertSnapshot(db, 'voliere-toit', 220, 'c')
  assert.deepEqual(codes(db), ['voliere-toit:dc'])
})

test('insertSnapshot : une erreur annule tout, numéro compris', () => {
  const db = setup()
  db.exec("CREATE TRIGGER refuse BEFORE INSERT ON snapshots BEGIN SELECT RAISE(ABORT, 'refusé'); END")
  assert.throws(() => insertSnapshot(db, 'voliere-toit', 100, 'a'), /refusé/)
  assert.equal(setting(db, 'snapshot_seq_voliere-toit'), undefined)
  db.exec('DROP TRIGGER refuse')
  insertSnapshot(db, 'voliere-toit', 100, 'a')
  assert.deepEqual(codes(db), ['voliere-toit:da'])
})

test('backfillSnapshotCodes : les images d’avant, par caméra dans l’ordre des instants, puis plus rien', () => {
  const db = setup()
  const insert = db.prepare('INSERT INTO snapshots (camera, taken_at, path) VALUES (?, ?, ?)')
  for (const [camera, at] of [['voliere-toit', 30], ['voliere-toit', 10], ['voliere-interieur', 5], ['zebre', 7], ['abeille', 8], ['voliere-toit', 20]] as const) insert.run(camera, at, `${camera}/${at}.jpg`)
  assert.equal(backfillSnapshotCodes(db), 6)
  assert.deepEqual(codes(db), ['abeille:ea', 'voliere-interieur:aa', 'voliere-toit:da', 'voliere-toit:db', 'voliere-toit:dc', 'zebre:fa'].sort())
  assert.equal(setting(db, 'snapshot_seq_voliere-toit'), '3')
  assert.equal(backfillSnapshotCodes(db), 0)
  insertSnapshot(db, 'voliere-toit', 40, 'x')
  assert.equal(codes(db).includes('voliere-toit:dd'), true)
})

test('backfillSnapshotCodes : continue à la suite du compteur', () => {
  const db = setup()
  db.exec("INSERT INTO app_settings VALUES ('snapshot_seq_voliere-toit', '26')")
  db.exec("INSERT INTO snapshots (camera, taken_at, path) VALUES ('voliere-toit', 1, 'a')")
  assert.equal(backfillSnapshotCodes(db), 1)
  assert.deepEqual(codes(db), ['voliere-toit:daa'])
})

test('backfillSnapshotCodes : une erreur annule tout', () => {
  const db = setup()
  db.exec("INSERT INTO snapshots (camera, taken_at, path) VALUES ('voliere-toit', 1, 'a'), ('voliere-toit', 2, 'b')")
  db.exec("CREATE TRIGGER refuse BEFORE UPDATE ON snapshots WHEN NEW.taken_at = 2 BEGIN SELECT RAISE(ABORT, 'refusé'); END")
  assert.throws(() => backfillSnapshotCodes(db), /refusé/)
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM snapshots WHERE code IS NOT NULL').get() as { n: number }).n, 0)
  assert.equal(setting(db, 'snapshot_seq_voliere-toit'), undefined)
})
