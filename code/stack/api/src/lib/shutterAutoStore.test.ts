import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDoc } from '../testing/helpers.ts'
import { createShutterAutoStore } from './shutterAutoStore.ts'

test('sans document ou avec un document abîmé, rien n’est activé', () => {
  const doc = memoryDoc()
  const store = createShutterAutoStore(doc)
  assert.deepEqual(store.get(), {})
  for (const text of ['pas du json', '[1]', 'null']) {
    doc.write(text)
    assert.deepEqual(store.get(), {})
  }
})

test('set puis get', () => {
  const store = createShutterAutoStore(memoryDoc())
  store.set({ '1': { open: true, close: false, since: 5 } })
  assert.deepEqual(store.get(), { '1': { open: true, close: false, since: 5 } })
})

test('l’ancien format enabled vaut pour les deux options, les entrées fausses sont ignorées', () => {
  const doc = memoryDoc(
    JSON.stringify({
      a: { enabled: true, since: 1 },
      b: { enabled: false, since: 2 },
      c: { since: 3 },
      d: { open: true, close: 'non', since: 4, enabled: true },
      e: { open: true },
      f: null,
      g: { since: null },
    }),
  )
  assert.deepEqual(createShutterAutoStore(doc).get(), {
    a: { open: true, close: true, since: 1 },
    b: { open: false, close: false, since: 2 },
    c: { open: false, close: false, since: 3 },
    d: { open: true, close: true, since: 4 },
  })
})
