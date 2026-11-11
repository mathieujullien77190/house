import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { SnapshotsService } from '../services/snapshotsService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { snapshotsRouter } from './snapshots.ts'

test('snapshots : instants couverts et image la plus proche', async () => {
  const seen: unknown[] = []
  const snapshots = {
    times: (camera: string, from: number, to: number) => (seen.push([camera, from, to]), [1, 2]),
    nearest: (camera: string, at: number) => (camera === 'vide' ? null : { path: `snaps/${at}.jpg`, taken_at: 42, code: 'dz' }),
  } as unknown as SnapshotsService
  const files = { send: (res, path, type) => void res.send(`${path}|${type}`) } as BackupFiles
  await withServer(routerApp(snapshotsRouter(snapshots, files)), async (url) => {
    assert.deepEqual((await call(`${url}/snapshots?camera=a&from=5&to=9`)).body, [1, 2])
    // from et to absents ou invalides : valeurs par défaut
    await call(`${url}/snapshots?camera=a`)
    await call(`${url}/snapshots?camera=a&from=x&to=y`)
    assert.deepEqual(seen, [
      ['a', 5, 9],
      ['a', 0, Number.MAX_SAFE_INTEGER],
      ['a', 0, Number.MAX_SAFE_INTEGER],
    ])
    assert.equal((await call(`${url}/snapshots`)).status, 400)
    assert.equal((await call(`${url}/snapshots?camera=a%20b`)).status, 400)

    const found = await call(`${url}/snapshot?camera=a&at=100`)
    assert.equal(found.body, 'snaps/100.jpg|image/jpeg')
    assert.equal(found.headers.get('x-snapshot-at'), '42')
    assert.equal(found.headers.get('x-snapshot-code'), 'dz')
    assert.equal((await call(`${url}/snapshot?camera=vide&at=100`)).status, 404)
    assert.equal((await call(`${url}/snapshot?camera=a`)).status, 400)
    assert.equal((await call(`${url}/snapshot?camera=a&at=x`)).status, 400)
    assert.equal((await call(`${url}/snapshot?at=1`)).status, 400)
  })
})
