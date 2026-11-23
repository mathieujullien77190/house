import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CamerasService } from '../services/camerasService.ts'
import { UnknownAcUnit, type AcService } from '../services/acService.ts'
import { UnknownHueId, type HueService } from '../services/hueService.ts'
import type { LiveService, Upstream } from '../services/liveService.ts'
import { UnknownShutter, type ShuttersService } from '../services/shuttersService.ts'
import { call, memoryDoc, routerApp, withServer } from '../testing/helpers.ts'
import { lanRouter, LAN_CAMERAS, TV_CAMERAS, type LanDeps, type LanServices } from './lan.ts'

const KEY = 'une-cle-assez-longue'
const HEADERS = { 'X-Lan-Key': KEY }
const ALL_ON = JSON.stringify({ enabled: true, cameras: true, shutters: true, lights: true, ac: true })

const body = (text: string): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    },
  })

interface Setup {
  services: LanServices
  deps: LanDeps
  opened: unknown[][]
  lights: unknown[]
  fail: { error: Error | null }
}

const setup = (doc = ALL_ON, overrides: Partial<LanServices> = {}, key = KEY): Setup => {
  const opened: unknown[][] = []
  const lights: unknown[] = []
  const fail = { error: null as Error | null }
  const upstream = (text: string): Upstream => ({ status: 200, contentType: 'image/jpeg', body: body(text) })
  const services: LanServices = {
    hue: {
      list: async () => [
        { id: 'r1', name: 'Salon', lights: [{ id: '1', name: 'Plafonnier' }, { id: '26', name: 'Perruche' }] },
        { id: 'r2', name: 'Volière', lights: [{ id: '26', name: 'Perruche' }] },
      ],
      setLight: async (id: string, patch: unknown) => {
        if (fail.error) throw fail.error
        if (id === 'inconnue') throw new UnknownHueId(id)
        lights.push([id, patch])
        return { id, ...(patch as object) }
      },
    } as unknown as HueService,
    shutters: {
      state: () => ({ mock: true, shutters: [{ id: '1', name: 'Salon', lastCommand: 'up', lastAt: 5 }] }),
      command: async (id: string, command: string) => {
        if (fail.error) throw fail.error
        if (id === '9') throw new UnknownShutter(id)
        return { id, name: 'Salon', lastCommand: command, lastAt: 7 }
      },
    } as unknown as ShuttersService,
    ac: {
      state: async () => [{ id: 'salon', name: 'Salon', reachable: true, power: true, mode: 'heat', targetTemp: 20, roomTemp: 19, fan: 'auto', vane: 'auto', wideVane: 'center' }],
      update: async (id: string, patch: unknown) => {
        if (fail.error) throw fail.error
        if (id === 'cave') throw new UnknownAcUnit(id)
        return { id, patch }
      },
    } as unknown as AcService,
    live: {
      stream: async (...args: unknown[]) => {
        opened.push(['stream', ...args.slice(0, 1), ...args.slice(2)])
        return upstream('flux')
      },
      frame: async (...args: unknown[]) => {
        opened.push(['frame', args[0]])
        return upstream('image')
      },
    } as unknown as LiveService,
    cameras: { liveStreams: () => [{ camera: 'voliere-interieur', orientation: 'portrait' }, { camera: 'voliere-exterieur', orientation: 'landscape' }] } as unknown as CamerasService,
    ...overrides,
  }
  return { services, deps: { key, prefixes: [], host: 'chezmatou.local', port: 8080, doc: memoryDoc(doc) }, opened, lights, fail }
}

const serve = (s: Setup, work: (url: string) => Promise<void>) => withServer(routerApp(lanRouter(s.services, s.deps)), work)

const token = async (url: string): Promise<string> => ((await call(`${url}/lan/token`, 'GET', undefined, HEADERS)).body as { token: string }).token

test('sans clé configurée : 503 ; sans la clé : 401', async () => {
  await serve(setup(ALL_ON, {}, ''), async (url) => assert.equal((await call(`${url}/lan/state`)).status, 503))
  await serve(setup(), async (url) => {
    assert.equal((await call(`${url}/lan/state`)).status, 401)
    assert.equal((await call(`${url}/lan/state`, 'GET', undefined, HEADERS)).status, 200)
  })
})

test('tout coupé (sans document, ou interrupteur général) : 403 désactivé', async () => {
  for (const doc of [memoryDoc(), memoryDoc(JSON.stringify({ enabled: false, cameras: true }))]) {
    const s = setup()
    s.deps.doc = doc
    await serve(s, async (url) => {
      const reply = await call(`${url}/lan/state`, 'GET', undefined, HEADERS)
      assert.deepEqual([reply.status, reply.body], [403, { error: 'désactivé' }])
    })
  }
})

test('l’état : caméras (orientation), volets, lampes sans la lampe exclue, clim sans ailettes', async () => {
  await serve(setup(), async (url) => {
    const reply = await call(`${url}/lan/state`, 'GET', undefined, HEADERS)
    assert.equal(reply.status, 200)
    assert.deepEqual(reply.body, {
      access: { cameras: true, shutters: true, lights: true, ac: true },
      cameras: [
        { id: 'voliere-interieur', name: 'Volière, intérieur', orientation: 'portrait' },
        { id: 'voliere-exterieur', name: 'Volière, extérieur', orientation: 'landscape' },
      ],
      shutters: [{ id: '1', name: 'Salon', lastCommand: 'up' }],
      lights: [
        { id: 'r1', name: 'Salon', lights: [{ id: '1', name: 'Plafonnier' }] },
        { id: 'r2', name: 'Volière', lights: [] },
      ],
      ac: [{ id: 'salon', name: 'Salon', reachable: true, power: true, mode: 'heat', targetTemp: 20, roomTemp: 19, fan: 'auto' }],
    })
  })
})

test('l’état : une partie coupée, absente ou en panne vaut null', async () => {
  await serve(setup(JSON.stringify({ enabled: true })), async (url) => {
    const reply = await call(`${url}/lan/state`, 'GET', undefined, HEADERS)
    assert.deepEqual(reply.body, { access: { cameras: false, shutters: false, lights: false, ac: false }, cameras: null, shutters: null, lights: null, ac: null })
  })
  const broken = setup(ALL_ON, {
    hue: { list: async () => { throw new Error('pont') } } as unknown as HueService,
    shutters: { state: () => { throw new Error('esp') } } as unknown as ShuttersService,
    ac: null,
    cameras: { liveStreams: () => { throw new Error('base') } } as unknown as CamerasService,
  })
  await serve(broken, async (url) => {
    const state = (await call(`${url}/lan/state`, 'GET', undefined, HEADERS)).body as Record<string, unknown>
    assert.equal(state.shutters, null)
    assert.equal(state.lights, null)
    assert.equal(state.ac, null)
    assert.deepEqual(state.cameras, LAN_CAMERAS.map(({ id, name }) => ({ id, name, orientation: 'landscape' })))
  })
  const empty = setup(ALL_ON, { hue: { list: async () => undefined } as unknown as HueService, ac: { state: async () => undefined } as unknown as AcService, shutters: { state: () => ({ shutters: [] }) } as unknown as ShuttersService, cameras: undefined })
  await serve(empty, async (url) => {
    const state = (await call(`${url}/lan/state`, 'GET', undefined, HEADERS)).body as Record<string, unknown>
    assert.deepEqual([state.lights, state.ac, state.shutters], [[], [], []])
  })
  const noShutters = setup(ALL_ON, { shutters: { state: () => undefined } as unknown as ShuttersService })
  await serve(noShutters, async (url) => assert.equal(((await call(`${url}/lan/state`, 'GET', undefined, HEADERS)).body as { shutters: unknown }).shutters, null))
})

test('le jeton ouvre le flux léger et l’image, jamais sans lui ; caméra inconnue : 404', async () => {
  const s = setup()
  await serve(s, async (url) => {
    const issued = await call(`${url}/lan/token`, 'GET', undefined, HEADERS)
    assert.equal(issued.headers.get('cache-control'), 'no-store')
    assert.equal((issued.body as { expiresIn: number }).expiresIn, 60)
    const t = await token(url)
    assert.equal((await call(`${url}/lan/stream/voliere-interieur`)).status, 401)
    assert.equal((await call(`${url}/lan/stream/voliere-interieur?t=${t}`)).body, 'flux')
    assert.equal((await call(`${url}/lan/frame/voliere-exterieur?t=${t}`)).body, 'image')
    assert.equal((await call(`${url}/lan/stream/salon-de-jardin?t=${t}`)).status, 404)
    assert.deepEqual(s.opened, [['stream', 'voliere-interieur', false, false, true], ['frame', 'voliere-exterieur']])
  })
})

test('quality=hd : le 4K pour le flux seulement, un seul à la fois', async () => {
  const s = setup(ALL_ON, {
    live: {
      stream: async (...args: unknown[]) => {
        s.opened.push(['stream', args[0], args[2]])
        return { status: 200, contentType: 'multipart/x-mixed-replace', body: new ReadableStream({ start: (controller) => controller.enqueue(new TextEncoder().encode('x')), pull: () => new Promise(() => undefined) }) }
      },
      frame: async () => ({ status: 200, contentType: 'image/jpeg', body: body('image') }),
    } as unknown as LiveService,
  })
  await serve(s, async (url) => {
    const t = await token(url)
    const first = new AbortController()
    const one = await fetch(`${url}/lan/stream/voliere-interieur?quality=hd&t=${t}`, { signal: first.signal })
    assert.equal(one.status, 200)
    const two = await fetch(`${url}/lan/stream/voliere-exterieur?quality=hd&t=${t}`)
    assert.equal(two.status, 200)
    await assert.rejects(one.text())
    first.abort()
    await two.body?.cancel()
    assert.equal((await call(`${url}/lan/frame/voliere-interieur?quality=hd&t=${t}`)).body, 'image')
    assert.deepEqual(s.opened, [['stream', 'voliere-interieur', true], ['stream', 'voliere-exterieur', true]])
    // un flux léger n'a pas à fermer le 4K : un flux fermé se libère sans erreur
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
})

test('caméras coupées : jeton et images refusés', async () => {
  await serve(setup(JSON.stringify({ enabled: true, cameras: false })), async (url) => {
    assert.equal((await call(`${url}/lan/token`, 'GET', undefined, HEADERS)).status, 403)
  })
})

test('volets : un ordre valide, un faux, un inconnu, une panne, sans service', async () => {
  const s = setup()
  await serve(s, async (url) => {
    const send = (id: string, payload?: unknown) => call(`${url}/lan/shutters/${id}`, 'POST', payload, HEADERS)
    assert.deepEqual((await send('1', { command: 'down' })).body, { id: '1', name: 'Salon', lastCommand: 'down' })
    assert.equal((await send('1', { command: 'fermer' })).status, 400)
    assert.equal((await send('1', {})).status, 400)
    assert.equal((await send('1')).status, 400)
    assert.equal((await send('9', { command: 'up' })).status, 404)
    s.fail.error = new Error('esp')
    assert.equal((await send('1', { command: 'up' })).status, 502)
  })
  await serve(setup(ALL_ON, { shutters: null }), async (url) => assert.equal((await call(`${url}/lan/shutters/1`, 'POST', { command: 'up' }, HEADERS)).status, 503))
  await serve(setup(JSON.stringify({ enabled: true })), async (url) => assert.equal((await call(`${url}/lan/shutters/1`, 'POST', { command: 'up' }, HEADERS)).status, 403))
})

test('lampes : allumer à pleine puissance, éteindre, corps faux, inconnue, panne, sans pont', async () => {
  const s = setup()
  await serve(s, async (url) => {
    const send = (id: string, payload?: unknown) => call(`${url}/lan/lights/${id}`, 'PUT', payload, HEADERS)
    assert.equal((await send('1', { on: true })).status, 200)
    assert.equal((await send('26', { on: false })).status, 200)
    assert.deepEqual(s.lights, [['1', { on: true, bri: 254 }], ['26', { on: false }]])
    assert.equal((await send('1', { on: 'oui' })).status, 400)
    assert.equal((await send('1', { on: true, bri: 3 })).status, 400)
    assert.equal((await send('1')).status, 400)
    assert.equal((await send('inconnue', { on: true })).status, 404)
    s.fail.error = new Error('pont')
    assert.equal((await send('1', { on: true })).status, 502)
  })
  await serve(setup(ALL_ON, { hue: null }), async (url) => assert.equal((await call(`${url}/lan/lights/1`, 'PUT', { on: true }, HEADERS)).status, 503))
})

test('clim : les réglages permis, pas les ailettes ; inconnue, panne, sans clim', async () => {
  const s = setup()
  await serve(s, async (url) => {
    const send = (id: string, payload?: unknown) => call(`${url}/lan/ac/${id}`, 'POST', payload, HEADERS)
    assert.equal((await send('salon', { on: true, mode: 'cool', temperature: 21, fan: 'quiet' })).status, 200)
    assert.equal((await send('salon', { vane: 'swing' })).status, 400)
    assert.equal((await send('salon', { temperature: 40 })).status, 400)
    assert.equal((await send('salon')).status, 400)
    assert.equal((await send('cave', { on: true })).status, 404)
    s.fail.error = new Error('module')
    assert.equal((await send('salon', { on: true })).status, 502)
  })
  await serve(setup(ALL_ON, { ac: null }), async (url) => assert.equal((await call(`${url}/lan/ac/salon`, 'POST', { on: true }, HEADERS)).status, 503))
})

test('une caméra absente de la base : paysage par défaut', async () => {
  const s = setup(ALL_ON, { cameras: { liveStreams: () => [{ camera: 'voliere-interieur' }] } as unknown as CamerasService })
  await serve(s, async (url) => {
    const state = (await call(`${url}/lan/state`, 'GET', undefined, HEADERS)).body as { cameras: { orientation: string }[] }
    assert.deepEqual(state.cameras.map((camera) => camera.orientation), ['landscape', 'landscape'])
  })
})

test('la clé de la télé : toutes les caméras et son propre jeton ; celle des invités n’en voit que deux', async () => {
  const TV = 'la-cle-de-la-tele-longue'
  const s = setup()
  s.deps.tvKey = TV
  await serve(s, async (url) => {
    const state = (await call(`${url}/lan/state`, 'GET', undefined, { 'X-Lan-Key': TV })).body as { cameras: { id: string }[] }
    assert.deepEqual(state.cameras.map((camera) => camera.id), TV_CAMERAS.map((camera) => camera.id))
    const guest = (await call(`${url}/lan/state`, 'GET', undefined, HEADERS)).body as { cameras: { id: string }[] }
    assert.equal(guest.cameras.length, LAN_CAMERAS.length)
    const t = ((await call(`${url}/lan/token`, 'GET', undefined, { 'X-Lan-Key': TV })).body as { token: string }).token
    assert.equal((await call(`${url}/lan/stream/salon-de-jardin?t=${t}`)).body, 'flux')
    const guestToken = await token(url)
    assert.equal((await call(`${url}/lan/stream/salon-de-jardin?t=${guestToken}`)).status, 404)
  })
})
