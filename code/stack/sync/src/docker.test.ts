// Tests de la lecture du fichier d'état Docker.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseDocker, readDocker } from './docker.ts'
import { tempDir } from './testing.ts'

test('parseDocker : conteneurs, âge et configuration globale', () => {
  const content = JSON.stringify({ at: 100, containers: [{ name: 'sync' }], global: { engine: {} } })
  assert.deepEqual(parseDocker(content, 130), { containers: [{ name: 'sync' }], global: { engine: {} }, ageSeconds: 30 })
  assert.equal(parseDocker(JSON.stringify({ at: 100, containers: [] }), 90)?.ageSeconds, 0)
  assert.equal(parseDocker(JSON.stringify({ at: 100, containers: [], global: 3 }), 100)?.global, null)
})

test('parseDocker : trop vieux, incomplet ou illisible = null', () => {
  assert.equal(parseDocker(JSON.stringify({ at: 100, containers: [] }), 221), null)
  assert.equal(parseDocker(JSON.stringify({ at: 'x', containers: [] }), 0), null)
  assert.equal(parseDocker(JSON.stringify({ at: 1, containers: {} }), 0), null)
  assert.equal(parseDocker('pas du json', 0), null)
})

test('readDocker : service disponible ou non, compose lu directement', async () => {
  const dir = tempDir()
  const now = Math.floor(Date.now() / 1000)
  writeFileSync(`${dir}/docker.json`, JSON.stringify({ at: now, containers: [] }))
  writeFileSync(`${dir}/compose.yml`, 'services: {}')
  const up = await readDocker(`${dir}/docker.json`, `${dir}/compose.yml`)
  assert.equal(up.serviceAvailable, true)
  assert.equal(up.compose, 'services: {}')
  const down = await readDocker(`${dir}/absent.json`, `${dir}/absent.yml`)
  assert.deepEqual(down, { serviceAvailable: false, containers: [], global: null, compose: null, ageSeconds: 0 })
})
