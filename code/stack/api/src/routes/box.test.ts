import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FreeboxError } from '../lib/freebox.ts'
import { WhitelistMode, type BoxService } from '../services/boxService.ts'
import type { BoxWatcher } from '../services/boxWatcher.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { boxRouter } from './box.ts'

const GUEST = 'AA:BB:CC:DD:EE:01'
const HOME = 'AA:BB:CC:DD:EE:02'

const watcher = {
  recent: (count: number) => [{ at: count, event: 'connect', mac: GUEST, name: 'Tel', ip: null, type: null, vendor: null }],
  homeList: () => [{ mac: HOME, name: 'TV', ip: null }],
  guestList: () => [{ mac: GUEST, name: 'Tel', ip: null, type: null, vendor: null, firstSeen: 1, lastSeen: 2, active: true }],
  addToHome: (mac: unknown) => (mac === 'x' ? 'invalid' : mac === 'later' ? 'not-ready' : { mac, name: 'N', ip: null }),
} as unknown as BoxWatcher

const boxWith = (setExcluded: BoxService['setExcluded'], filter: Awaited<ReturnType<BoxService['macFilter']>> | Error) =>
  ({
    setExcluded,
    macFilter: async () => {
      if (filter instanceof Error) throw filter
      return filter
    },
  }) as unknown as BoxService

test('GET /box/guests : résumé, invités avec leur exclusion, événements, limite validée', async () => {
  const box = boxWith(async () => ({ excluded: true }), { state: 'blacklist', entries: [{ id: 'a', mac: GUEST, type: 'blacklist' }] })
  await withServer(routerApp(boxRouter(box, watcher)), async (url) => {
    const body = (await call(`${url}/box/guests`)).body as { filterState: string; guests: { excluded: boolean }[]; events: { at: number }[] }
    assert.equal(body.filterState, 'blacklist')
    assert.equal(body.guests[0].excluded, true)
    assert.equal(body.events[0].at, 100)
    assert.equal(((await call(`${url}/box/guests?limit=7`)).body as typeof body).events[0].at, 7)
    for (const bad of ['0', '501', 'abc', '1.5']) assert.equal((await call(`${url}/box/guests?limit=${bad}`)).status, 400, bad)
    assert.equal((await call(`${url}/box/guests?limit=1&limit=2`)).status, 400)
  })
})

test('GET /box/guests : excluded est null si la box ne répond pas ou sans box', async () => {
  const mute = boxWith(async () => ({ excluded: true }), new Error('muette'))
  await withServer(routerApp(boxRouter(mute, watcher)), async (url) => {
    const body = (await call(`${url}/box/guests`)).body as { filterState: null; guests: { excluded: null }[] }
    assert.deepEqual([body.filterState, body.guests[0].excluded], [null, null])
  })
  await withServer(routerApp(boxRouter(null, watcher)), async (url) => {
    assert.equal(((await call(`${url}/box/guests`)).body as { guests: { excluded: null }[] }).guests[0].excluded, null)
  })
})

test('GET /box/known et PUT /box/known', async () => {
  await withServer(routerApp(boxRouter(null, watcher)), async (url) => {
    assert.deepEqual((await call(`${url}/box/known`)).body, { home: [{ mac: HOME, name: 'TV', ip: null }] })
    const put = (mac: unknown) => call(`${url}/box/known`, 'PUT', { mac })
    assert.equal((await put('AA:BB:CC:DD:EE:03')).status, 200)
    assert.equal((await put('x')).status, 400)
    assert.equal((await put('later')).status, 503)
  })
})

test('PUT /box/guests/:mac/exclude : validations, succès et erreurs de la box', async () => {
  const calls: string[] = []
  let failure: Error | null = null
  const box = boxWith(
    async (mac, excluded) => {
      if (failure) throw failure
      calls.push(`${mac} ${excluded}`)
      return { excluded }
    },
    { state: 'disabled', entries: [] },
  )
  await withServer(routerApp(boxRouter(box, watcher)), async (url) => {
    const exclude = (mac: string, body: unknown = { excluded: true }) => call(`${url}/box/guests/${mac}/exclude`, 'PUT', body)
    assert.equal((await exclude('pas-une-mac')).status, 400)
    assert.equal((await exclude(GUEST, { excluded: 'oui' })).status, 400)
    assert.equal((await exclude(HOME)).status, 400)
    assert.equal((await exclude('AA:BB:CC:DD:EE:09')).status, 404)
    assert.deepEqual((await exclude(GUEST.toLowerCase())).body, { excluded: true })
    assert.deepEqual((await exclude(GUEST, { excluded: false })).body, { excluded: false })
    assert.deepEqual(calls, [`${GUEST} true`, `${GUEST} false`])
    failure = new WhitelistMode()
    const white = await exclude(GUEST)
    assert.deepEqual([white.status, white.body], [409, { error: 'la box est en liste blanche' }])
    failure = new FreeboxError('refusé', 403, 'insufficient_rights')
    const rights = await exclude(GUEST)
    assert.equal(rights.status, 502)
    assert.match((rights.body as { error: string }).error, /Modification des réglages/)
    failure = new FreeboxError('autre', 500)
    assert.equal(((await exclude(GUEST)).body as { error: string }).error, 'box: autre')
    failure = new Error('x')
    assert.equal(((await exclude(GUEST)).body as { error: string }).error, 'box unreachable')
  })
})

test('sans surveillant : 503', async () => {
  await withServer(routerApp(boxRouter(null)), async (url) => {
    assert.equal((await call(`${url}/box/guests`)).status, 503)
    assert.equal((await call(`${url}/box/known`)).status, 503)
    assert.equal((await call(`${url}/box/known`, 'PUT', { mac: 'a' })).status, 503)
    assert.equal((await call(`${url}/box/guests/${GUEST}/exclude`, 'PUT', { excluded: true })).status, 503)
  })
})

test('GET /box : non configurée, état tel quel sans liste de la maison, `home` ajouté avec elle', async () => {
  await withServer(routerApp(boxRouter(null)), async (url) => {
    assert.equal(((await call(`${url}/box`)).body as { configured: boolean }).configured, false)
  })
  const state = { configured: true, devices: [{ mac: HOME, name: 'TV' }, { mac: GUEST, name: 'Tel' }] }
  const box = { state: async () => state } as unknown as BoxService
  await withServer(routerApp(boxRouter(box)), async (url) => {
    assert.deepEqual((await call(`${url}/box`)).body, state)
  })
  const empty = { homeList: () => [] } as unknown as BoxWatcher
  await withServer(routerApp(boxRouter(box, empty)), async (url) => {
    assert.deepEqual((await call(`${url}/box`)).body, state)
  })
  await withServer(routerApp(boxRouter(box, watcher)), async (url) => {
    const devices = ((await call(`${url}/box`)).body as { devices: { home: boolean }[] }).devices
    assert.deepEqual(devices.map((device) => device.home), [true, false])
  })
})

test('GET /box/guest-wifi : 503, 404, mot de passe sans cache, erreurs de la box', async () => {
  await withServer(routerApp(boxRouter(null)), async (url) => {
    assert.equal((await call(`${url}/box/guest-wifi`)).status, 503)
  })
  let answer: () => Promise<unknown> = async () => null
  const box = { guestWifi: () => answer() } as unknown as BoxService
  await withServer(routerApp(boxRouter(box)), async (url) => {
    assert.equal((await call(`${url}/box/guest-wifi`)).status, 404)
    answer = async () => ({ ssid: 'Invites', password: 'secret' })
    const ok = await fetch(`${url}/box/guest-wifi`)
    assert.equal(ok.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await ok.json(), { ssid: 'Invites', password: 'secret' })
    answer = async () => {
      throw new FreeboxError('refusé', 403)
    }
    assert.deepEqual((await call(`${url}/box/guest-wifi`)).body, { error: 'box: refusé' })
    answer = async () => {
      throw new Error('x')
    }
    assert.deepEqual((await call(`${url}/box/guest-wifi`)).body, { error: 'box unreachable' })
  })
})

test('DELETE /box/known/:mac : retire de la maison, ou 400, 503, 404', async () => {
  let result: string = 'ok'
  const removing = {
    homeList: () => [{ mac: HOME, name: 'TV', ip: null }],
    removeFromHome: () => result,
  } as unknown as BoxWatcher
  await withServer(routerApp(boxRouter(null)), async (url) => {
    assert.equal((await call(`${url}/box/known/${HOME}`, 'DELETE')).status, 503)
  })
  await withServer(routerApp(boxRouter(null, removing)), async (url) => {
    const remove = () => call(`${url}/box/known/${HOME}`, 'DELETE')
    assert.deepEqual((await remove()).body, { home: [{ mac: HOME, name: 'TV', ip: null }] })
    for (const [name, status] of [['invalid', 400], ['not-ready', 503], ['absent', 404]] as const) {
      result = name
      assert.equal((await remove()).status, status, name)
    }
  })
})

test('PUT /box/wifi : 503, 400, succès, erreurs de la box', async () => {
  await withServer(routerApp(boxRouter(null)), async (url) => {
    assert.equal((await call(`${url}/box/wifi`, 'PUT', { enabled: true })).status, 503)
  })
  let failure: Error | null = null
  const box = {
    setWifi: async (enabled: boolean) => {
      if (failure) throw failure
      return { enabled }
    },
  } as unknown as BoxService
  await withServer(routerApp(boxRouter(box)), async (url) => {
    const put = (body: unknown) => call(`${url}/box/wifi`, 'PUT', body)
    assert.equal((await put({ enabled: 'oui' })).status, 400)
    assert.deepEqual((await put({ enabled: false })).body, { enabled: false })
    failure = new FreeboxError('refusé', 403)
    assert.deepEqual((await put({ enabled: true })).body, { error: 'box: refusé' })
    failure = new Error('x')
    assert.deepEqual((await put({ enabled: true })).body, { error: 'box unreachable' })
  })
})
