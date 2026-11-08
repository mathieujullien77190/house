import assert from 'node:assert/strict'
import type { IncomingMessage } from 'node:http'
import { test } from 'node:test'
import type { CamerasRepository } from '../repositories/camerasRepository.ts'
import { withServer } from '../testing/helpers.ts'
import { createLiveService } from './liveService.ts'

const repository = (rows: { camera: string; url: string }[]): CamerasRepository =>
  ({ liveStreams: () => rows, lastImages: () => [] }) as unknown as CamerasRepository

test('le go2rtc d’une caméra : celui de son adresse de direct, sinon le premier', () => {
  const live = createLiveService(
    ['http://un:1984', 'http://deux:1984'],
    repository([
      { camera: 'a', url: 'http://deux:1984/stream.html?src=a_sub' },
      { camera: 'b', url: 'http://inconnu:1984/x' },
      { camera: 'c', url: 'pas une adresse' },
    ]),
  )
  assert.equal(live.baseOf('a'), 'http://deux:1984')
  assert.equal(live.baseOf('b'), 'http://un:1984')
  assert.equal(live.baseOf('c'), 'http://un:1984')
  assert.equal(live.baseOf('absente'), 'http://un:1984')
})

test('le direct et l’image sont relayés depuis go2rtc, avec le bon flux', async () => {
  const seen: string[] = []
  await withServer(
    (req: IncomingMessage, res) => {
      seen.push(decodeURIComponent(req.url ?? ''))
      if (req.url?.includes('frame')) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' })
      } else {
        // pas de type de contenu : le relais en donne un par défaut
        res.writeHead(200)
      }
      res.end('data')
    },
    async (url) => {
      const live = createLiveService(
        [url],
        repository([
          { camera: 'a', url: `${url}/stream.html?src=cam_sub` },
          { camera: 'sans-src', url: `${url}/x` },
          { camera: 'cassee', url: 'pas une adresse' },
        ]),
      )
      const abort = new AbortController()

      const frame = await live.frame('a', abort.signal)
      assert.equal(frame?.status, 200)
      assert.equal(frame?.contentType, 'image/jpeg')
      assert.equal(await new Response(frame?.body).text(), 'data')

      const light = await live.stream('a', abort.signal)
      assert.equal(light?.contentType, 'application/octet-stream')
      await light?.body?.cancel()
      const hd = await live.stream('a', abort.signal, true)
      await hd?.body?.cancel()
      const mobile = await live.stream('a', abort.signal, false, true)
      await mobile?.body?.cancel()
      // le flux léger se termine par _sub, pas un autre : seul _sub devient _main
      const none = createLiveService([url], repository([{ camera: 'b', url: `${url}/stream.html?src=autre` }]))
      await (await none.stream('b', abort.signal, true))?.body?.cancel()

      assert.deepEqual(seen, [
        '/api/frame.jpeg?src=cam_sub',
        '/api/stream.mjpeg?src=cam_sub_mjpeg',
        '/api/stream.mjpeg?src=cam_main_mjpeg',
        '/api/stream.mjpeg?src=cam_sub_mjpeg_m',
        '/api/stream.mjpeg?src=autre_mjpeg',
      ])

      // caméra inconnue, ou sans nom de flux dans son adresse : null
      assert.equal(await live.stream('absente', abort.signal), null)
      assert.equal(await live.frame('sans-src', abort.signal), null)
      assert.equal(await live.frame('cassee', abort.signal), null)
      assert.equal(await live.frame('absente', abort.signal), null)
    },
  )
})
