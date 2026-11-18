import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDoc } from '../testing/helpers.ts'
import { DISABLED, readLanAccess } from './lanAccess.ts'

test('les interrupteurs lus du document : seul true allume', () => {
  const doc = memoryDoc(JSON.stringify({ enabled: true, cameras: true, shutters: 'oui', lights: false, ac: 1 }))
  assert.deepEqual(readLanAccess(doc), { enabled: true, cameras: true, shutters: false, lights: false, ac: false })
})

test('sans document, avec un texte qui n’est pas du JSON ou pas un objet : tout est coupé', () => {
  assert.deepEqual(readLanAccess(memoryDoc()), DISABLED)
  assert.deepEqual(readLanAccess(memoryDoc('pas du json')), DISABLED)
  assert.deepEqual(readLanAccess(memoryDoc('null')), DISABLED)
  assert.deepEqual(readLanAccess(memoryDoc('12')), DISABLED)
  assert.deepEqual(readLanAccess(memoryDoc(null, 'EISDIR')), DISABLED)
})
