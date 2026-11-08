// Tests de l'en-tête Range.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseRange } from './range.ts'

test('intervalles valables : a-b, a- et -n', () => {
  assert.deepEqual(parseRange('bytes=0-99', 1000), { start: 0, end: 99 })
  assert.deepEqual(parseRange('bytes=900-', 1000), { start: 900, end: 999 })
  assert.deepEqual(parseRange('bytes=-100', 1000), { start: 900, end: 999 })
  assert.deepEqual(parseRange('bytes=-5000', 1000), { start: 0, end: 999 })
  assert.deepEqual(parseRange('bytes=10-5000', 1000), { start: 10, end: 999 })
})

test('sans Range, ou illisible : null (le fichier entier)', () => {
  assert.equal(parseRange(undefined, 1000), null)
  assert.equal(parseRange('items=0-1', 1000), null)
  assert.equal(parseRange('bytes=-', 1000), null)
})

test('hors du fichier : invalid (416)', () => {
  assert.equal(parseRange('bytes=1000-', 1000), 'invalid')
  assert.equal(parseRange('bytes=50-10', 1000), 'invalid')
  assert.equal(parseRange('bytes=-0', 1000), 'invalid')
  assert.equal(parseRange('bytes=-5', 0), 'invalid')
})
