import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { readZones, validPolygon } from './zones.ts'

test('un polygone valable', () => {
  assert.ok(
    validPolygon([
      [0, 0],
      [1, 0],
      [0, 1],
    ]),
  )
  assert.ok(
    !validPolygon([
      [0, 0],
      [1, 0],
    ]),
  )
  assert.ok(
    !validPolygon([
      [0, 0],
      [1, 0],
      [2, 1],
    ]),
  )
  assert.ok(!validPolygon('x'))
})

test('les zones : fichier lu, absent = aucune zone, dossier absent ou fichier abîmé = inconnu', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zones-'))
  try {
    const file = join(dir, 'zones.json')
    assert.deepEqual(await readZones(file), {})
    writeFileSync(
      file,
      JSON.stringify({
        a: [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
        b: [[0, 0]],
      }),
    )
    assert.deepEqual(await readZones(file), {
      a: [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
    })
    writeFileSync(file, '{abîmé')
    assert.equal(await readZones(file), null)
    assert.equal(await readZones(join(dir, 'absent', 'zones.json')), null)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('un fichier qui n est pas un objet, ou illisible pour une autre raison, est inconnu', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zones-'))
  try {
    const file = join(dir, 'zones.json')
    for (const content of ['[]', 'null', '3']) {
      writeFileSync(file, content)
      assert.equal(await readZones(file), null)
    }
    mkdirSync(join(dir, 'dossier.json'))
    assert.equal(await readZones(join(dir, 'dossier.json')), null)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
