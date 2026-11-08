// Tests de la consommation : fichier du processeur et PoE des caméras (https simulé).
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'
import { writeFileSync } from 'node:fs'
import { afterEach, mock, test } from 'node:test'
import { fetchCameraPower, parseCameras, parseCpuPower, readCpuPower, readPower, type ApiTarget } from './power.ts'
import { tempDir } from './testing.ts'

afterEach(() => {
  mock.restoreAll()
  syncBuiltinESMExports()
})

const target: ApiTarget = { url: 'https://api:8080', key: 'k', ca: 'CA', servername: 'localhost' }

/** Remplace https.request : `script` joue la réponse (ou l'erreur) quand la requête est envoyée. */
const fakeApi = (script: (req: EventEmitter & { destroy: (error?: Error) => void }, answer: (status: number, body: string) => void) => void) => {
  const calls: unknown[][] = []
  mock.method(https, 'request', (...args: unknown[]) => {
    calls.push(args)
    const callback = args[2] as (res: EventEmitter & { statusCode: number; setEncoding: () => void }) => void
    const req = Object.assign(new EventEmitter(), {
      destroy: (error?: Error) => void (error && req.emit('error', error)),
      end: () =>
        script(req, (status, body) => {
          const res = Object.assign(new EventEmitter(), { statusCode: status, setEncoding: () => undefined })
          callback(res)
          res.emit('data', body)
          res.emit('end')
        }),
    })
    return req
  })
  syncBuiltinESMExports()
  return calls
}

test('parseCpuPower : watts et âge ; trop vieux ou incomplet = null', () => {
  assert.deepEqual(parseCpuPower(JSON.stringify({ watts: 12, at: 100 }), 130), { watts: 12, ageSeconds: 30 })
  assert.equal(parseCpuPower(JSON.stringify({ watts: 12, at: 100 }), 90)?.ageSeconds, 0)
  assert.equal(parseCpuPower(JSON.stringify({ watts: 12, at: 100 }), 161), null)
  assert.equal(parseCpuPower(JSON.stringify({ watts: 'x', at: 100 }), 100), null)
  assert.equal(parseCpuPower(JSON.stringify({ watts: 1, at: 'x' }), 100), null)
  assert.equal(parseCpuPower('{', 100), null)
})

test('readCpuPower lit le fichier de l\'hôte', async () => {
  const dir = tempDir()
  writeFileSync(`${dir}/cpu.json`, JSON.stringify({ watts: 9, at: Math.floor(Date.now() / 1000) }))
  assert.equal((await readCpuPower(`${dir}/cpu.json`))?.watts, 9)
  assert.equal(await readCpuPower(`${dir}/absent.json`), null)
})

test('parseCameras : les entrées complètes seulement', () => {
  assert.deepEqual(parseCameras([{ camera: 'a', watts: 4.5, powered: true }, { camera: 'b', watts: 0 }, { camera: 3, watts: 1 }, { camera: 'c', watts: 'x' }]), [
    { camera: 'a', watts: 4.5, powered: true },
    { camera: 'b', watts: 0, powered: false },
  ])
  assert.equal(parseCameras({}), null)
})

test('fetchCameraPower : réponse valable', async () => {
  const calls = fakeApi((_req, answer) => answer(200, JSON.stringify([{ camera: 'a', watts: 3, powered: true }])))
  assert.deepEqual(await fetchCameraPower(target), [{ camera: 'a', watts: 3, powered: true }])
  assert.equal(calls[0]?.[0], 'https://api:8080/poe')
})

test('fetchCameraPower : code refusé, réponse inattendue ou illisible', async () => {
  fakeApi((_req, answer) => answer(500, ''))
  await assert.rejects(fetchCameraPower(target), /réponse 500/)
  mock.restoreAll()
  fakeApi((_req, answer) => answer(200, '{}'))
  await assert.rejects(fetchCameraPower(target), /inattendue/)
  mock.restoreAll()
  fakeApi((_req, answer) => answer(200, 'pas du json'))
  await assert.rejects(fetchCameraPower(target), /illisible/)
})

test('fetchCameraPower : erreur réseau et délai dépassé', async () => {
  fakeApi((req) => req.emit('error', new Error('refusé')))
  await assert.rejects(fetchCameraPower(target), /API : refusé/)
  mock.restoreAll()
  fakeApi((req) => req.emit('timeout'))
  await assert.rejects(fetchCameraPower(target), /pas de réponse/)
})

test('readPower : sans API configurée, avec API, et API en panne', async () => {
  const dir = tempDir()
  writeFileSync(`${dir}/cpu.json`, JSON.stringify({ watts: 9, at: Math.floor(Date.now() / 1000) }))
  const none = await readPower(`${dir}/cpu.json`, null)
  assert.equal(none.cameras, null)
  assert.equal(none.camerasError, 'API non configurée')
  fakeApi((_req, answer) => answer(200, '[]'))
  assert.deepEqual((await readPower(`${dir}/cpu.json`, target)).cameras, [])
  mock.restoreAll()
  fakeApi((req) => req.emit('error', new Error('x')))
  assert.equal((await readPower(`${dir}/cpu.json`, target)).camerasError, 'API : x')
})

test('readPower : une erreur qui n\'est pas une Error est mise en texte', async () => {
  mock.method(https, 'request', () => {
    throw 'chaîne'
  })
  syncBuiltinESMExports()
  const report = await readPower('/absent', target)
  assert.equal(report.camerasError, 'chaîne')
})
