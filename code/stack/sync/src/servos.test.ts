// Tests de la configuration des servos des volets : lecture, validation, fusion, écriture.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { DEFAULT_SERVOS, mergeServos, parseServos, readServos, SERVO_COMMANDS, writeServos, type ServoConfig } from './servos.ts'
import { tempDir } from './testing.ts'

const dir = tempDir()

test('les trois ordres', () => {
  assert.deepEqual(SERVO_COMMANDS, ['up', 'down', 'stop'])
})

test("parseServos : la configuration par défaut est valide, l'adresse est nettoyée", () => {
  assert.deepEqual(parseServos(DEFAULT_SERVOS), DEFAULT_SERVOS)
  assert.equal(parseServos({ ...DEFAULT_SERVOS, url: ' http://esp:80/// ' })?.url, 'http://esp:80')
})

test('parseServos : refuse ce qui est faux', () => {
  assert.equal(parseServos(null), null)
  assert.equal(parseServos([]), null)
  assert.equal(parseServos({ ...DEFAULT_SERVOS, url: 3 }), null)
  assert.equal(parseServos({ ...DEFAULT_SERVOS, url: 'ftp://esp' }), null)
  assert.equal(parseServos({ ...DEFAULT_SERVOS, shutters: 'non' }), null)
  assert.equal(parseServos({ ...DEFAULT_SERVOS, shutters: { '2': DEFAULT_SERVOS.shutters['2'] } }), null)
  const order = DEFAULT_SERVOS.shutters['2'].up
  const withUp = (up: unknown) => ({ ...DEFAULT_SERVOS, shutters: { ...DEFAULT_SERVOS.shutters, '2': { ...DEFAULT_SERVOS.shutters['2'], up } } })
  assert.equal(parseServos(withUp('non')), null)
  assert.equal(parseServos(withUp({ ...order, channel: 1.5 })), null)
  assert.equal(parseServos(withUp({ ...order, channel: 16 })), null)
  assert.equal(parseServos(withUp({ ...order, start: -91 })), null)
  assert.equal(parseServos(withUp({ ...order, end: 'x' })), null)
  assert.equal(parseServos(withUp({ ...order, speed: -1 })), null)
  assert.equal(parseServos(withUp({ ...order, hold: Number.NaN })), null)
  assert.notEqual(parseServos(withUp({ ...order, speed: 0 })), null)
})

test('mergeServos : ajoute les champs reçus à la configuration actuelle', () => {
  const merged = mergeServos(DEFAULT_SERVOS, { url: 'http://autre', shutters: { '5': { up: { end: 30 } } } }) as ServoConfig
  assert.equal(merged.url, 'http://autre')
  assert.equal(merged.shutters['5'].up.end, 30)
  assert.equal(merged.shutters['5'].up.channel, 4)
  assert.deepEqual(merged.shutters['2'], DEFAULT_SERVOS.shutters['2'])
  assert.deepEqual(mergeServos(DEFAULT_SERVOS, {}), DEFAULT_SERVOS)
})

test('mergeServos : refuse un corps ou un champ faux', () => {
  assert.equal(mergeServos(DEFAULT_SERVOS, null), null)
  assert.equal(mergeServos(DEFAULT_SERVOS, { shutters: 'non' }), null)
  assert.equal(mergeServos(DEFAULT_SERVOS, { shutters: { '9': {} } }), null)
  assert.equal(mergeServos(DEFAULT_SERVOS, { shutters: { '2': 'non' } }), null)
  assert.equal(mergeServos(DEFAULT_SERVOS, { shutters: { '2': { up: 'non' } } }), null)
  assert.equal(mergeServos(DEFAULT_SERVOS, { shutters: { '2': { up: { channel: 99 } } } }), null)
  assert.equal(mergeServos(DEFAULT_SERVOS, { url: 'x' }), null)
})

test('readServos : sans fichier ou fichier faux, les valeurs par défaut', async () => {
  assert.deepEqual(await readServos(`${dir}/absent.json`), DEFAULT_SERVOS)
  writeFileSync(`${dir}/abime.json`, 'x{')
  assert.deepEqual(await readServos(`${dir}/abime.json`), DEFAULT_SERVOS)
  writeFileSync(`${dir}/tableau.json`, '[]')
  assert.deepEqual(await readServos(`${dir}/tableau.json`), DEFAULT_SERVOS)
  writeFileSync(`${dir}/faux.json`, JSON.stringify({ shutters: 'non' }))
  assert.deepEqual(await readServos(`${dir}/faux.json`), DEFAULT_SERVOS)
  writeFileSync(`${dir}/valeur.json`, JSON.stringify({ url: 'ftp://x' }))
  assert.deepEqual(await readServos(`${dir}/valeur.json`), DEFAULT_SERVOS)
})

test('readServos : forme actuelle, volets manquants par défaut ; ancienne forme = le salon', async () => {
  const salon = { ...DEFAULT_SERVOS.shutters['2'], up: { channel: 9, start: 1, end: 2, speed: 3, hold: 4 } }
  writeFileSync(`${dir}/actuel.json`, JSON.stringify({ url: 'http://x', shutters: { '2': salon } }))
  const current = await readServos(`${dir}/actuel.json`)
  assert.equal(current.url, 'http://x')
  assert.deepEqual(current.shutters['2'], salon)
  assert.deepEqual(current.shutters['5'], DEFAULT_SERVOS.shutters['5'])
  writeFileSync(`${dir}/sansurl.json`, JSON.stringify({ shutters: {} }))
  assert.deepEqual(await readServos(`${dir}/sansurl.json`), DEFAULT_SERVOS)
  writeFileSync(`${dir}/ancien.json`, JSON.stringify({ url: 'http://y', ...salon }))
  const old = await readServos(`${dir}/ancien.json`)
  assert.equal(old.url, 'http://y')
  assert.deepEqual(old.shutters['2'], salon)
})

test('writeServos : écrit (dossier créé) puis relu', async () => {
  const file = `${dir}/sous/servos.json`
  await writeServos(file, DEFAULT_SERVOS)
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), DEFAULT_SERVOS)
  assert.deepEqual(await readServos(file), DEFAULT_SERVOS)
  mkdirSync(`${dir}/dossier.json`)
  await assert.rejects(writeServos(`${dir}/dossier.json`, DEFAULT_SERVOS))
})
