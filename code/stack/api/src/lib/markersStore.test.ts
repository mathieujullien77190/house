import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createMarkersStore, isCameraName, MAX_PLACE, MIN_PLACE, parseMarkers } from './markersStore.ts'

test('des repères valables sont arrondis à 4 décimales, la liste vide aussi', () => {
  assert.deepEqual(parseMarkers([{ target: 'voliere-interieur', x: 0.123456, y: 0.5 }]), [{ target: 'voliere-interieur', x: 0.1235, y: 0.5 }])
  assert.deepEqual(parseMarkers([]), [])
})

test('les places vont de -0,5 à 1,5 compris', () => {
  assert.deepEqual(parseMarkers([{ target: 'a', x: MIN_PLACE, y: MAX_PLACE }]), [{ target: 'a', x: MIN_PLACE, y: MAX_PLACE }])
  assert.equal(parseMarkers([{ target: 'a', x: MIN_PLACE - 0.1, y: 0 }]), null)
  assert.equal(parseMarkers([{ target: 'a', x: MAX_PLACE + 0.1, y: 0 }]), null)
  assert.equal(parseMarkers([{ target: 'a', x: 0, y: MIN_PLACE - 0.1 }]), null)
  assert.equal(parseMarkers([{ target: 'a', x: 0, y: MAX_PLACE + 0.1 }]), null)
})

test('des repères mal formés sont refusés', () => {
  assert.equal(parseMarkers(null), null)
  assert.equal(parseMarkers('non'), null)
  assert.equal(parseMarkers(Array.from({ length: 9 }, () => ({ target: 'a', x: 0, y: 0 }))), null)
  assert.equal(parseMarkers(Array.from({ length: 8 }, () => ({ target: 'a', x: 0, y: 0 })))?.length, 8)
  assert.equal(parseMarkers(['x']), null)
  assert.equal(parseMarkers([null]), null)
  assert.equal(parseMarkers([{ x: 0, y: 0 }]), null)
  assert.equal(parseMarkers([{ target: 3, x: 0, y: 0 }]), null)
  assert.equal(parseMarkers([{ target: 'mauvais nom', x: 0, y: 0 }]), null)
  assert.equal(parseMarkers([{ target: 'a', x: 'a', y: 0 }]), null)
  assert.equal(parseMarkers([{ target: 'a', x: 0, y: 'a' }]), null)
  assert.equal(parseMarkers([{ target: 'a', x: Infinity, y: 0 }]), null)
  assert.equal(parseMarkers([{ target: 'a', x: 0, y: NaN }]), null)
})

test('un nom de caméra : lettres, chiffres, tiret, 40 caractères au plus', () => {
  assert.equal(isCameraName('voliere-interieur'), true)
  assert.equal(isCameraName(''), false)
  assert.equal(isCameraName('a'.repeat(41)), false)
  assert.equal(isCameraName('a/b'), false)
})

test('les repères d’une caméra se gardent, se remplacent et se retirent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'markers-'))
  try {
    const file = join(dir, 'sous', 'markers.json')
    const store = createMarkersStore(file)
    assert.deepEqual(store.get(), {})
    const list = [{ target: 'b', x: 0.2, y: 0.3 }]
    assert.deepEqual(store.set('a', list), { a: list })
    assert.equal(existsSync(`${file}.tmp`), false)
    assert.deepEqual(createMarkersStore(file).get(), { a: list })
    assert.deepEqual(store.set('a', []), { a: [] })
    assert.deepEqual(store.set('a', null), {})
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), {})
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('un fichier abîmé ou d’une autre forme vaut aucun repère, les entrées invalides sont ignorées', () => {
  const dir = mkdtempSync(join(tmpdir(), 'markers-'))
  try {
    const file = join(dir, 'markers.json')
    const store = createMarkersStore(file)
    writeFileSync(file, '{pas du json')
    assert.deepEqual(store.get(), {})
    writeFileSync(file, '[]')
    assert.deepEqual(store.get(), {})
    writeFileSync(file, 'null')
    assert.deepEqual(store.get(), {})
    writeFileSync(file, JSON.stringify({ a: [{ target: 'b', x: 0, y: 0 }], b: 'non', 'mauvais nom': [] }))
    assert.deepEqual(store.get(), { a: [{ target: 'b', x: 0, y: 0 }] })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
