// Tests de la configuration des servos des volets : lecture, validation, fusion, écriture.
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createHouseStateTable } from './houseState.ts'
import { DEFAULT_SERVOS, mergeServos, parseServos, readServos, SERVO_COMMANDS, writeServos, type ServoConfig } from './servos.ts'
import { putState } from './testing.ts'

const memory = () => {
  const db = new DatabaseSync(':memory:')
  createHouseStateTable(db)
  return db
}
/** Une base où le document `servos` vaut ce texte. */
const withServos = (text: string) => {
  const db = memory()
  putState(db, 'servos', text)
  return db
}

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

test('readServos : sans document ou document faux, les valeurs par défaut', () => {
  assert.deepEqual(readServos(memory()), DEFAULT_SERVOS)
  assert.deepEqual(readServos(new DatabaseSync(':memory:')), DEFAULT_SERVOS)
  assert.deepEqual(readServos(withServos('x{')), DEFAULT_SERVOS)
  assert.deepEqual(readServos(withServos('[]')), DEFAULT_SERVOS)
  assert.deepEqual(readServos(withServos(JSON.stringify({ shutters: 'non' }))), DEFAULT_SERVOS)
  assert.deepEqual(readServos(withServos(JSON.stringify({ url: 'ftp://x' }))), DEFAULT_SERVOS)
})

test('readServos : forme actuelle, volets manquants par défaut ; ancienne forme = le salon', () => {
  const salon = { ...DEFAULT_SERVOS.shutters['2'], up: { channel: 9, start: 1, end: 2, speed: 3, hold: 4 } }
  const current = readServos(withServos(JSON.stringify({ url: 'http://x', shutters: { '2': salon } })))
  assert.equal(current.url, 'http://x')
  assert.deepEqual(current.shutters['2'], salon)
  assert.deepEqual(current.shutters['5'], DEFAULT_SERVOS.shutters['5'])
  assert.deepEqual(readServos(withServos(JSON.stringify({ shutters: {} }))), DEFAULT_SERVOS)
  const old = readServos(withServos(JSON.stringify({ url: 'http://y', ...salon })))
  assert.equal(old.url, 'http://y')
  assert.deepEqual(old.shutters['2'], salon)
})

test('writeServos : écrit dans house_state puis relu, la date est notée, un second écrit remplace', () => {
  const db = memory()
  writeServos(db, DEFAULT_SERVOS, 100)
  assert.deepEqual(readServos(db), DEFAULT_SERVOS)
  const other = { ...DEFAULT_SERVOS, url: 'http://autre' }
  writeServos(db, other, 200)
  assert.deepEqual(readServos(db), other)
  assert.equal((db.prepare("SELECT updated_at FROM house_state WHERE key = 'servos'").get() as { updated_at: number }).updated_at, 200)
  assert.throws(() => writeServos(new DatabaseSync(':memory:'), DEFAULT_SERVOS, 1))
})
