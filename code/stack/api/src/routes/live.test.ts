import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LiveService, Upstream } from '../services/liveService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { liveRouter } from './live.ts'

const streamOf = (chunks: string[], fail = false): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder()
  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) controller.enqueue(encoder.encode(chunks[index++]))
      else if (fail) controller.error(new Error('go2rtc coupé'))
      else controller.close()
    },
  })
}

type Open = (camera: string, signal: AbortSignal, hd?: boolean, mobile?: boolean) => Promise<Upstream | null>

const setup = (open: Open) => {
  const live = { stream: open, frame: open } as unknown as LiveService
  return routerApp(liveRouter(live))
}

test('le flux est recopié tel quel, avec ses options de qualité et d’écran', async () => {
  const seen: unknown[] = []
  const app = setup(async (camera, _signal, hd, mobile) => {
    seen.push([camera, hd, mobile])
    return { status: 200, contentType: 'multipart/x-mixed-replace; boundary=frame', body: streamOf(['un', 'deux']) }
  })
  await withServer(app, async (url) => {
    const reply = await call(`${url}/stream?camera=cam-1`)
    assert.equal(reply.body, 'undeux')
    assert.equal(reply.headers.get('content-type'), 'multipart/x-mixed-replace; boundary=frame')
    assert.equal(reply.headers.get('cache-control'), 'no-store')
    await call(`${url}/frame?camera=cam-1&quality=hd&screen=mobile`)
    assert.deepEqual(seen, [
      ['cam-1', false, false],
      ['cam-1', true, true],
    ])
  })
})

test('un nom de caméra invalide ou absent : 400 ; une caméra inconnue : 404', async () => {
  const app = setup(async () => null)
  await withServer(app, async (url) => {
    assert.equal((await call(`${url}/stream`)).status, 400)
    assert.equal((await call(`${url}/stream?camera=a%20b`)).status, 400)
    assert.deepEqual((await call(`${url}/frame?camera=inconnue`)).body, { error: 'unknown camera' })
  })
})

test('go2rtc injoignable : 502 ; go2rtc qui répond mal : 502, le corps est libéré', async () => {
  let cancelled = 0
  const refused: Upstream = {
    status: 404,
    contentType: 'text/plain',
    // un corps qui refuse de s'annuler ne doit rien casser
    body: new ReadableStream({
      cancel: () => {
        cancelled += 1
        throw new Error('déjà fermé')
      },
    }),
  }
  const replies: (Upstream | Error)[] = [
    new Error('ECONNREFUSED'),
    refused,
    { status: 204, contentType: 'x', body: null },
    { status: 200, contentType: 'x', body: null },
  ]
  const app = setup(async () => {
    const next = replies.shift() as Upstream | Error
    if (next instanceof Error) throw next
    return next
  })
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/stream?camera=a`)).body, { error: 'go2rtc unreachable' })
    assert.deepEqual((await call(`${url}/stream?camera=a`)).body, { error: 'go2rtc answered 404' })
    assert.equal(cancelled, 1)
    assert.deepEqual((await call(`${url}/stream?camera=a`)).body, { error: 'go2rtc answered 204' })
    assert.deepEqual((await call(`${url}/stream?camera=a`)).body, { error: 'go2rtc answered 200' })
  })
})

test('un flux qui casse en route termine la réponse ; fermer la page coupe la demande à go2rtc', async () => {
  let aborted = false
  const app = setup(async (_camera, signal) => {
    signal.addEventListener('abort', () => void (aborted = true))
    return { status: 200, contentType: 'image/jpeg', body: streamOf(['début'], true) }
  })
  await withServer(app, async (url) => {
    // la réponse se termine proprement, même si go2rtc casse le flux (ce qui a déjà été envoyé importe peu)
    const reply = await fetch(`${url}/stream?camera=a`)
    assert.equal(reply.status, 200)
    await reply.text().catch(() => '')
    // le signal est coupé quand la réponse se ferme
    await new Promise((done) => setTimeout(done, 50))
    assert.equal(aborted, true)
  })
})
