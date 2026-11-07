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
