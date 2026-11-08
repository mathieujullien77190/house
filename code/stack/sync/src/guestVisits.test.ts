import assert from 'node:assert/strict'
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createGuestVisitsTable, importGuestVisits, parseVisit, purgeGuestVisits } from './guestVisits.ts'

const line = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({ at: 1_800_000_000, kind: 'page', ip: '192.168.1.66', origin: 'maison', key: 'avec clé', device: 'Chrome 130 · Windows', path: '/', status: 200, ...patch })

const withFile = async (check: (db: DatabaseSync, file: string) => Promise<void>) => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-visits-'))
  const db = new DatabaseSync(':memory:')
  createGuestVisitsTable(db)
  try {
    await check(db, join(dir, 'visits.jsonl'))
  } finally {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  }
}
const count = (db: DatabaseSync) => (db.prepare('SELECT COUNT(*) AS n FROM guest_visits').get() as { n: number }).n

test('parseVisit : un flux garde sa durée et sa fin ; une ligne absurde est ignorée', () => {
  const visit = parseVisit(line({ kind: 'stream', camera: 'voliere-interieur', quality: '4K', duration: 12.34, bytes: 5000 }))
  assert.equal(visit?.ended_at, 1_800_000_012)
  assert.equal(visit?.duration_seconds, 12.3)
  assert.equal(visit?.camera, 'voliere-interieur')
  assert.equal(visit?.cle, 'avec clé')
  assert.equal(parseVisit('pas du json'), null)
  assert.equal(parseVisit(JSON.stringify({ at: 1, kind: 'autre' })), null)
})

test('importGuestVisits importe seulement les lignes complètes, puis la suite au tour suivant', async () => {
  await withFile(async (db, file) => {
    writeFileSync(file, `${line()}\n${line({ kind: 'refused', status: 404 })}\n${line().slice(0, 20)}`)
    assert.equal(await importGuestVisits(db, file), 2)
    assert.equal(await importGuestVisits(db, file), 0)
    appendFileSync(file, `${line().slice(20)}\n`)
    assert.equal(await importGuestVisits(db, file), 1)
    assert.equal(count(db), 3)
  })
})

test('un fichier plus court que la position gardée est relu depuis le début ; un fichier absent ne fait rien', async () => {
  await withFile(async (db, file) => {
    assert.equal(await importGuestVisits(db, file), 0)
    writeFileSync(file, `${line()}\n${line()}\n`)
    assert.equal(await importGuestVisits(db, file), 2)
    writeFileSync(file, `${line({ at: 1_800_000_100 })}\n`)
    assert.equal(await importGuestVisits(db, file), 1)
    assert.equal(count(db), 3)
  })
})

test('purgeGuestVisits supprime les visites trop vieilles', async () => {
  await withFile(async (db, file) => {
    writeFileSync(file, `${line({ at: 1_000_000_000 })}\n${line({ at: 1_800_000_000 })}\n`)
    await importGuestVisits(db, file)
    assert.equal(purgeGuestVisits(db, 365, 1_800_000_100), 1)
    assert.equal(count(db), 1)
  })
})

test('une visite avec clé, caméra et qualité garde ses champs ; sans durée, pas de fin', () => {
  const visit = parseVisit(line({ key: 'clé fausse', duration: undefined }))
  assert.equal(visit?.cle, 'clé fausse')
  assert.equal(visit?.ended_at, null)
  assert.equal(visit?.duration_seconds, null)
  assert.equal(parseVisit(line({ key: undefined }))?.cle, null)
})

test('une table d\'avant la colonne cle la reçoit, et ses visites de page ou de flux prennent « avec clé »', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE guest_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at INTEGER NOT NULL, ended_at INTEGER, kind TEXT NOT NULL, ip TEXT NOT NULL, origin TEXT NOT NULL, device TEXT NOT NULL)')
  db.exec("INSERT INTO guest_visits (started_at, kind, ip, origin, device) VALUES (1, 'page', 'a', 'b', 'c'), (2, 'refused', 'a', 'b', 'c')")
  createGuestVisitsTable(db)
  assert.deepEqual(
    (db.prepare('SELECT cle FROM guest_visits ORDER BY id').all() as { cle: string | null }[]).map((row) => row.cle),
    ['avec clé', null],
  )
})

test('rien de nouveau, une ligne vide ou absurde, ou une base qui refuse : le fichier est relu au prochain tour', async () => {
  await withFile(async (db, file) => {
    writeFileSync(file, `${line()}\n\n{"at":1}\n`)
    assert.equal(await importGuestVisits(db, file), 1)
    assert.equal(await importGuestVisits(db, file), 0)
    appendFileSync(file, `${line()}\n`)
    db.exec("CREATE TRIGGER refuse BEFORE INSERT ON guest_visits BEGIN SELECT RAISE(ABORT, 'refusé'); END")
    await assert.rejects(importGuestVisits(db, file), /refusé/)
    assert.equal(count(db), 1)
    db.exec('DROP TRIGGER refuse')
    assert.equal(await importGuestVisits(db, file), 1)
  })
})

test('purgeGuestVisits : sans date, l\'heure réelle', async () => {
  await withFile(async (db, file) => {
    writeFileSync(file, `${line({ at: 1_000_000_000 })}\n`)
    await importGuestVisits(db, file)
    assert.equal(purgeGuestVisits(db, 365), 1)
  })
})
