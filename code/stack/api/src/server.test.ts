import assert from 'node:assert/strict'
import http from 'node:http'
import https from 'node:https'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { createAppServer, stopServer } from './server.ts'
import { withTempDir } from './testing/helpers.ts'

const app: http.RequestListener = (_req, res) => void res.end('ok')

test('sans certificat, le serveur est en HTTP et répond', async () => {
  const server = createAppServer({ tls: null }, app)
  assert.equal(server instanceof https.Server, false)
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  try {
    const { port } = server.address() as { port: number }
    assert.equal(await (await fetch(`http://127.0.0.1:${port}`)).text(), 'ok')
  } finally {
    server.closeAllConnections()
    await new Promise((done) => server.close(done))
  }
})

test('avec un certificat, le serveur est en HTTPS avec le certificat et la clé lus', async (t) => {
  await withTempDir((dir) => {
    const cert = join(dir, 'cert.pem')
    const key = join(dir, 'key.pem')
    writeFileSync(cert, 'CERTIFICAT')
    writeFileSync(key, 'CLE')
    const fake = new http.Server()
    const create = t.mock.method(https, 'createServer', () => fake)
    assert.equal(createAppServer({ tls: { cert, key } }, app), fake)
    const options = create.mock.calls[0].arguments[0] as { cert: Buffer; key: Buffer }
    assert.equal(options.cert.toString(), 'CERTIFICAT')
    assert.equal(options.key.toString(), 'CLE')
    assert.equal(create.mock.calls[0].arguments[1], app)
  })
})

test('l’arrêt coupe les connexions ouvertes puis quitte', () => {
  const steps: string[] = []
  const server = {
    close: (callback?: () => void) => {
      steps.push('close')
      callback?.()
      return server
    },
    closeAllConnections: () => void steps.push('closeAll'),
  }
  stopServer(server as never, (code) => void steps.push(`exit ${code}`))
  assert.deepEqual(steps, ['close', 'exit 0', 'closeAll'])
})
