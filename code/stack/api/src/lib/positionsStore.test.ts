import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDoc } from '../testing/helpers.ts'
import { createPositionsStore, parsePositions } from './positionsStore.ts'

test('des positions valables sont arrondies', () => {
  assert.deepEqual(parsePositions({ '3': { x: 1.4, y: -2.6 } }), { '3': { x: 1, y: -3 } })
})

test('des positions mal formées sont refusées', () => {
  assert.equal(parsePositions(null), null)
  assert.equal(parsePositions('a'), null)
  assert.equal(parsePositions([]), null)
  assert.equal(parsePositions({}), null)
  assert.equal(parsePositions({ '1': { x: 1, y: 1 }, '2': { x: 1, y: 1 } }, 1), null)
  assert.equal(parsePositions({ lampe: { x: 1, y: 1 } }), null)
  assert.equal(parsePositions({ '1': 5 }), null)
  assert.equal(parsePositions({ '1': null }), null)
  assert.equal(parsePositions({ '1': { x: 'a', y: 1 } }), null)
  assert.equal(parsePositions({ '1': { x: 1, y: 'a' } }), null)
  assert.equal(parsePositions({ '1': { x: Infinity, y: 1 } }), null)
  assert.equal(parsePositions({ '1': { x: 1, y: NaN } }), null)
  assert.equal(parsePositions({ '1': { x: 5001, y: 1 } }), null)
  assert.equal(parsePositions({ '1': { x: 1, y: -5001 } }), null)
})

test('le magasin fusionne, écrit et relit ; un document illisible donne {}', () => {
  const doc = memoryDoc()
  const store = createPositionsStore(doc)
  assert.deepEqual(store.get(), {})
  assert.deepEqual(store.merge({ '1': { x: 1, y: 2 } }), { '1': { x: 1, y: 2 } })
  assert.deepEqual(store.merge({ '2': { x: 3, y: 4 } }), { '1': { x: 1, y: 2 }, '2': { x: 3, y: 4 } })
  assert.deepEqual(JSON.parse(doc.text() ?? ''), store.get())
  doc.write('pas du json')
  assert.deepEqual(store.get(), {})
  // du JSON valable mais pas des positions
  doc.write('[1]')
  assert.deepEqual(store.get(), {})
})
