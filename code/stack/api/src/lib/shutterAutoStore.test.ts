import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createShutterAutoStore } from './shutterAutoStore.ts'

test('sans fichier ou avec un fichier abîmé, rien n’est activé', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'auto.json')
    const store = createShutterAutoStore(file)
    assert.deepEqual(store.get(), {})
    writeFileSync(file, 'pas du json')
    assert.deepEqual(store.get(), {})
    writeFileSync(file, '[1]')
    assert.deepEqual(store.get(), {})
    writeFileSync(file, 'null')
    assert.deepEqual(store.get(), {})
  })
})

test('set puis get, dans un dossier à créer', async () => {
  await withTempDir((dir) => {
    const store = createShutterAutoStore(join(dir, 'sous', 'auto.json'))
    store.set({ '1': { open: true, close: false, since: 5 } })
    assert.deepEqual(store.get(), { '1': { open: true, close: false, since: 5 } })
  })
})

test('l’ancien format enabled vaut pour les deux options, les entrées fausses sont ignorées', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'auto.json')
    writeFileSync(
      file,
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
    assert.deepEqual(createShutterAutoStore(file).get(), {
      a: { open: true, close: true, since: 1 },
      b: { open: false, close: false, since: 2 },
      c: { open: false, close: false, since: 3 },
      d: { open: true, close: true, since: 4 },
    })
  })
})
