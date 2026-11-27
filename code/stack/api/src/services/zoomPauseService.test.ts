import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import type { ZoomState } from '../lib/reolinkClient.ts'
import { createRecorderPause, createZoomPause, GRACE_MS } from './zoomPauseService.ts'

/** Laisse passer les promesses en attente (les envois à l'enregistreur ne sont pas attendus). */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))

const setup = (t: TestContext, names = ['pommier']) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  const zooms: Record<string, ZoomState | Error> = { pommier: { pos: 0, min: 0, max: 28 }, portail: { pos: 0, min: 0, max: 28 } }
  const pushes: string[] = []
  const logs: string[] = []
  const recorder = { down: false }
  const reads: string[] = []
  const pause = createZoomPause({
    cameras: names.map((camera) => ({ camera })),
    read: async ({ camera }) => {
      reads.push(camera)
      const zoom = zooms[camera]
      if (zoom instanceof Error) throw zoom
      return zoom
    },
    push: async (camera, paused) => {
      if (recorder.down) throw new Error('http://motion:8080 injoignable')
      pushes.push(`${camera} ${paused}`)
    },
    log: (message) => void logs.push(message),
  })
  return { pause, zooms, pushes, logs, recorder, reads, tick: (ms: number) => t.mock.timers.tick(ms) }
}

test('zoom avant : pause tout de suite ; retour au grand angle : levée après le délai seulement', async (t) => {
  const { pause, pushes, logs, tick } = setup(t)
  assert.equal(pause.paused('pommier'), false)
  pause.onSet('pommier', 12, 0)
  assert.equal(pause.paused('pommier'), true)
  await settle()
  assert.deepEqual(pushes, ['pommier true'])
  pause.onSet('pommier', 0, 0)
  tick(GRACE_MS - 1)
  await settle()
  assert.equal(pause.paused('pommier'), true)
  assert.deepEqual(pushes, ['pommier true'])
  tick(1)
  await settle()
  assert.equal(pause.paused('pommier'), false)
  assert.deepEqual(pushes, ['pommier true', 'pommier false'])
  assert.equal(logs.length, 2)
})

test('un nouveau zoom avant pendant le délai annule la levée', async (t) => {
  const { pause, pushes, tick } = setup(t)
  pause.onSet('pommier', 5, 0)
  pause.onSet('pommier', 0, 0)
  tick(GRACE_MS / 2)
  pause.onSet('pommier', 9, 0)
  tick(GRACE_MS * 3)
  await settle()
  assert.equal(pause.paused('pommier'), true)
  assert.deepEqual(pushes, ['pommier true', 'pommier true'])
})

test('grand angle demandé sans pause en cours, ou caméra inconnue : rien', async (t) => {
  const { pause, pushes, logs, tick } = setup(t)
  pause.onSet('pommier', 0, 0)
  pause.onSet('absente', 9, 0)
  pause.observe('absente', { pos: 9, min: 0, max: 28 })
  tick(GRACE_MS * 2)
  await settle()
  assert.equal(pause.paused('pommier'), false)
  assert.equal(pause.paused('absente'), false)
  assert.deepEqual(pushes, [])
  assert.deepEqual(logs, [])
})

test('le tour : la position réelle décide, et l’état est redit à chaque fois', async (t) => {
  const { pause, zooms, pushes, logs } = setup(t, ['pommier', 'portail'])
  zooms.pommier = { pos: 7, min: 0, max: 28 }
  await pause.reconcile()
  assert.equal(pause.paused('pommier'), true)
  assert.equal(pause.paused('portail'), false)
  assert.deepEqual(pushes.sort(), ['pommier true', 'portail false'])
  zooms.pommier = { pos: 0, min: 0, max: 28 }
  await pause.reconcile()
  assert.equal(pause.paused('pommier'), false)
  assert.equal(pushes.length, 4)
  assert.equal(logs.length, 2)
})

test('le tour ne lève pas la pause pendant le délai, et ne relit pas la caméra', async (t) => {
  const { pause, pushes, reads, tick } = setup(t)
  // La caméra rend encore le grand angle juste après un zoom avant : l'état voulu fait foi.
  pause.onSet('pommier', 9, 0)
  await pause.reconcile()
  assert.equal(pause.paused('pommier'), true)
  pause.onSet('pommier', 0, 0)
  tick(GRACE_MS - 1)
  await pause.reconcile()
  assert.equal(pause.paused('pommier'), true)
  assert.deepEqual(reads, [])
  assert.deepEqual(pushes, ['pommier true', 'pommier true', 'pommier true'])
  tick(1)
  await pause.reconcile()
  assert.equal(pause.paused('pommier'), false)
  assert.deepEqual(reads, ['pommier'])
})

test('un réglage arrivé pendant la lecture du tour l’emporte', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  const answer: { give: (zoom: ZoomState) => void } = { give: () => undefined }
  const pushes: boolean[] = []
  const pause = createZoomPause({
    cameras: [{ camera: 'pommier' }],
    read: () => new Promise<ZoomState>((resolve) => void (answer.give = resolve)),
    push: async (_camera, paused) => void pushes.push(paused),
    log: () => undefined,
  })
  const round = pause.reconcile()
  pause.onSet('pommier', 9, 0)
  answer.give({ pos: 0, min: 0, max: 28 })
  await round
  assert.equal(pause.paused('pommier'), true)
  assert.deepEqual(pushes, [true, true])
})

test('caméra muette : état gardé, une ligne quand la panne commence et une quand elle finit, sans le détail', async (t) => {
  const { pause, zooms, pushes, logs } = setup(t)
  zooms.pommier = { pos: 7, min: 0, max: 28 }
  await pause.reconcile()
  zooms.pommier = new Error('http://10.0.0.7/?password=secret')
  await pause.reconcile()
  await pause.reconcile()
  assert.equal(pause.paused('pommier'), true)
  assert.deepEqual(pushes, ['pommier true', 'pommier true', 'pommier true'])
  zooms.pommier = { pos: 7, min: 0, max: 28 }
  await pause.reconcile()
  assert.equal(logs.length, 3)
  assert.match(logs[1], /ne répond pas/)
  assert.match(logs[2], /de nouveau/)
  assert.doesNotMatch(logs.join('\n'), /secret|10\.0\.0\.7/)
})

test('enregistreur muet : rien ne lève, une ligne par changement, sans le détail', async (t) => {
  const { pause, pushes, logs, recorder } = setup(t)
  recorder.down = true
  pause.onSet('pommier', 9, 0)
  await settle()
  await pause.reconcile()
  assert.equal(pause.paused('pommier'), true)
  assert.equal(logs.filter((line) => /enregistreur ne répond pas/.test(line)).length, 1)
  recorder.down = false
  await pause.reconcile()
  await pause.reconcile()
  assert.equal(logs.filter((line) => /répond de nouveau/.test(line)).length, 1)
  assert.deepEqual(pushes, ['pommier true', 'pommier true'])
  assert.doesNotMatch(logs.join('\n'), /motion:8080/)
})

test('une position lue par la route met l’état à jour, sauf pendant le délai', async (t) => {
  const { pause, pushes, tick } = setup(t)
  pause.observe('pommier', { pos: 0, min: 0, max: 28 })
  await settle()
  assert.deepEqual(pushes, [])
  pause.observe('pommier', { pos: 4, min: 0, max: 28 })
  await settle()
  assert.equal(pause.paused('pommier'), true)
  assert.deepEqual(pushes, ['pommier true'])
  pause.onSet('pommier', 0, 0)
  pause.observe('pommier', { pos: 0, min: 0, max: 28 })
  assert.equal(pause.paused('pommier'), true)
  tick(GRACE_MS)
  await settle()
  pause.observe('pommier', { pos: 0, min: 0, max: 28 })
  assert.equal(pause.paused('pommier'), false)
})

test('start : un tour tout de suite puis chaque minute ; l’arrêt coupe le tour et les levées en attente', async (t) => {
  const { pause, zooms, reads, pushes, tick } = setup(t)
  zooms.pommier = { pos: 3, min: 0, max: 28 }
  const stop = pause.start()
  await settle()
  assert.deepEqual(reads, ['pommier'])
  tick(60_000)
  await settle()
  assert.deepEqual(reads, ['pommier', 'pommier'])
  pause.onSet('pommier', 0, 0)
  stop()
  stop()
  tick(120_000)
  await settle()
  assert.deepEqual(reads, ['pommier', 'pommier'])
  assert.equal(pause.paused('pommier'), true)
  assert.deepEqual(pushes, ['pommier true', 'pommier true'])
})

test('createRecorderPause : PUT à l’enregistreur, une réponse en erreur lève', async () => {
  const calls: string[] = []
  const status = { value: 200 }
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(`${init?.method} ${String(url)}`)
    return new Response('{}', { status: status.value })
  }) as typeof fetch
  const push = createRecorderPause('http://motion:8080', fetcher)
  await push('pommier', true)
  await push('voliere toit', false)
  assert.deepEqual(calls, ['PUT http://motion:8080/api/cameras/pommier/pause?enabled=1', 'PUT http://motion:8080/api/cameras/voliere%20toit/pause?enabled=0'])
  status.value = 404
  await assert.rejects(push('pommier', true), /HTTP 404/)
})
