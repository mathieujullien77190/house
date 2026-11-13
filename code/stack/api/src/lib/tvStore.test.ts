import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createTvStore } from './tvStore.ts'

test('tvStore : vide, sauvegarde, relecture, oubli', async () => {
  await withTempDir((dir) => {
    const directory = join(dir, 'tv')
    const store = createTvStore(directory)
    assert.equal(store.paired(), false)
    assert.equal(store.load(), null)
    store.save({ cert: 'CERT', key: 'KEY' })
    assert.equal(store.paired(), true)
    assert.deepEqual(createTvStore(directory).load(), { cert: 'CERT', key: 'KEY' })
    if (process.platform !== 'win32') {
      assert.equal(statSync(join(directory, 'client.key')).mode & 0o777, 0o600)
      assert.equal(statSync(directory).mode & 0o777, 0o700)
    }
    store.clear()
    assert.equal(store.paired(), false)
    assert.equal(existsSync(join(directory, 'client.key')), false)
    assert.equal(createTvStore(directory).paired(), false)
  })
})
