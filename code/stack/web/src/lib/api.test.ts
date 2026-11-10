import { reply, stubFetch } from '@/test/fetch'
import {
  ApiError,
  callService,
  cancelFade,
  checkKey,
  clearStoredKey,
  fetchAutomations,
  fetchEvents,
  fetchFade,
  fetchGuest,
  fetchLampPositions,
  fetchLights,
  fetchLive,
  fetchPlan,
  fetchPlug,
  fetchShutters,
  closeShutterHalf,
  sendShutter,
  setShutterAuto,
  fetchPower,
  fetchRecording,
  fetchSavedEvents,
  fetchSensors,
  fetchSnapshot,
  fetchSnapshotTimes,
  fetchMarkers,
  fetchZones,
  isKeyRefused,
  KEY_STORAGE,
  putPlan,
  putMarkers,
  putZone,
  setCameraPower,
  setClipNote,
  setClipSaved,
  setHue,
  setPlug,
  saveHeating,
  fetchHeating,
  startFade,
  startRecording,
  stopRecording,
  type PlanDocument,
} from './api'

describe('ApiError et isKeyRefused', () => {
  it('garde le statut et reconnaît un refus 401', () => {
    const error = new ApiError(401, 'non')
    expect(error.status).toBe(401)
    expect(error.message).toBe('non')
    expect(isKeyRefused(error)).toBe(true)
    expect(isKeyRefused(new ApiError(500, 'x'))).toBe(false)
    expect(isKeyRefused(new Error('x'))).toBe(false)
  })
})

describe('lectures (GET)', () => {
  const reads: [string, (k: string) => Promise<unknown>, string][] = [
    ['checkKey', (k) => checkKey(k), '/auth'],
    ['fetchLive', (k) => fetchLive(k), '/direct'],
    ['fetchEvents', (k) => fetchEvents(k), '/events'],
    ['fetchSavedEvents', (k) => fetchSavedEvents(k), '/events?saved=1'],
    ['fetchGuest', (k) => fetchGuest(k), '/guest'],
    ['fetchPower', (k) => fetchPower(k), '/poe'],
    ['fetchPlug', (k) => fetchPlug(k), '/plug'],
    ['fetchHeating', (k) => fetchHeating(k), '/plug/heating'],
    ['fetchShutters', (k) => fetchShutters(k), '/shutters'],
    ['fetchLights', (k) => fetchLights(k), '/hue'],
    ['fetchAutomations', (k) => fetchAutomations(k), '/hue/automations'],
    ['fetchSensors', (k) => fetchSensors(k), '/hue/sensors'],
    ['fetchLampPositions', (k) => fetchLampPositions(k), '/hue/positions'],
    ['fetchSnapshotTimes', (k) => fetchSnapshotTimes(k, 'a b', 1.7, 2.1), '/snapshots?camera=a%20b&from=1&to=3'],
    ['fetchZones', (k) => fetchZones(k), '/zones'],
    ['fetchMarkers', (k) => fetchMarkers(k), '/markers'],
    ['fetchFade', (k) => fetchFade(k, 'l 1'), '/hue/lights/l%201/fade'],
    ['fetchRecording', (k) => fetchRecording(k, 'c 1'), '/record/c%201'],
  ]
  it.each(reads)('%s appelle %s avec la clé et rend le JSON', async (name, call, path) => {
    const spy = stubFetch(() => reply([1]))
    if (name === 'checkKey') {
      expect(await (call('k') as Promise<Response>).then((r) => r.status)).toBe(200)
    } else {
      expect(await call('k')).toEqual([1])
    }
    expect(spy).toHaveBeenCalledWith(path, { headers: { 'X-House-Key': 'k' } })
  })
  it.each(reads)('%s : 401 devient « clé refusée », autre statut une ApiError', async (_name, call) => {
    stubFetch(() => reply({}, 401))
    await expect(call('k')).rejects.toMatchObject({ status: 401, message: 'clé refusée' })
    stubFetch(() => reply({}, 500))
    await expect(call('k')).rejects.toMatchObject({ status: 500 })
  })

  it('fetchEvents avec fenêtre complète', async () => {
    const spy = stubFetch(() => reply([]))
    await fetchEvents('k', { camera: 'c', from: 1.9, to: 2.1, limit: 5 })
    expect(spy.mock.calls[0][0]).toBe('/events?camera=c&from=1&to=3&limit=5')
  })
  it('fetchEvents avec seulement la caméra', async () => {
    const spy = stubFetch(() => reply([]))
    await fetchEvents('k', { camera: 'c' })
    expect(spy.mock.calls[0][0]).toBe('/events?camera=c')
  })

  it('fetchPlan rend le plan ou null', async () => {
    stubFetch(() => reply({ plan: null }))
    expect(await fetchPlan('k')).toBeNull()
    stubFetch(() => reply({ plan: { trees: [] } }))
    expect(await fetchPlan('k')).toEqual({ trees: [] })
  })

  it('fetchSnapshot lit l’instant exact de l’image', async () => {
    const spy = stubFetch(() => reply('img', 200, { 'X-Snapshot-At': '1234' }))
    const result = await fetchSnapshot('k', 'a b', 10.9)
    expect(result.takenAt).toBe(1234)
    expect(await result.blob.text()).toBe('img')
    expect(spy.mock.calls[0][0]).toBe('/snapshot?camera=a%20b&at=10')
  })
  it.each([[''], ['0'], ['abc']])('fetchSnapshot : en-tête « %s » donne null', async (header) => {
    stubFetch(() => reply('img', 200, header ? { 'X-Snapshot-At': header } : {}))
    expect((await fetchSnapshot('k', 'c', 1)).takenAt).toBeNull()
  })
})

describe('callService', () => {
  it('rend le statut et le corps tels quels, sans lever', async () => {
    const spy = stubFetch(() => reply('oups', 404))
    expect(await callService('k', '/x')).toEqual({ status: 404, body: 'oups' })
    expect(spy).toHaveBeenCalledWith('/x', { headers: { 'X-House-Key': 'k' } })
  })
})

describe('écritures', () => {
  const plan = { trees: [], hedges: [], cage: null, offsets: {}, items: {}, cameras: [], links: {} } as PlanDocument
  const writes: [string, (k: string) => Promise<unknown>, string, string, unknown][] = [
    ['setClipSaved', (k) => setClipSaved(k, 'a/b', true), '/clips/a%2Fb/saved', 'PUT', { saved: true }],
    ['setClipNote', (k) => setClipNote(k, 'a/b', 'renard'), '/clips/a%2Fb/note', 'PUT', { note: 'renard' }],
    ['setCameraPower', (k) => setCameraPower(k, 'c 1', false), '/poe/c%201', 'POST', { on: false }],
    ['saveHeating', (k) => saveHeating(k, { thresholdC: 2 }), '/plug/heating', 'PUT', { thresholdC: 2 }],
    ['sendShutter', (k) => sendShutter(k, 'a 1', 'stop'), '/shutters/a%201', 'POST', { command: 'stop' }],
    ['setShutterAuto', (k) => setShutterAuto(k, 'a 1', { open: true }), '/shutters/a%201/auto', 'PUT', { open: true }],
    ['setPlug seul', (k) => setPlug(k, true), '/plug', 'POST', { on: true }],
    ['setPlug minuteur et mouvement', (k) => setPlug(k, true, 5, true), '/plug', 'POST', { on: true, minutes: 5, offOnMotion: true }],
    ['setHue', (k) => setHue(k, 'lights', 'l 1', { on: true, bri: 3 }), '/hue/lights/l%201', 'PUT', { on: true, bri: 3 }],
    ['putZone', (k) => putZone(k, 'c 1', [[0, 0]]), '/zones/c%201', 'PUT', { points: [[0, 0]] }],
    ['putZone null', (k) => putZone(k, 'c', null), '/zones/c', 'PUT', { points: null }],
    ['putMarkers', (k) => putMarkers(k, 'c 1', [{ target: 'd', x: 0.2, y: 0.3 }]), '/markers/c%201', 'PUT', { markers: [{ target: 'd', x: 0.2, y: 0.3 }] }],
    ['putMarkers null', (k) => putMarkers(k, 'c', null), '/markers/c', 'PUT', { markers: null }],
    ['putPlan', (k) => putPlan(k, plan), '/plan', 'PUT', plan],
    ['startFade', (k) => startFade(k, 'l 1'), '/hue/lights/l%201/fade', 'POST', { minutes: 15 }],
  ]
  it.each(writes)('%s envoie la bonne requête', async (_n, call, path, method, body) => {
    const spy = stubFetch(() => reply({ ok: 1 }))
    await call('k')
    const [calledPath, init] = spy.mock.calls[0]
    expect(calledPath).toBe(path)
    expect(init?.method).toBe(method)
    expect(JSON.parse(String(init?.body))).toEqual(body)
    expect((init?.headers as Record<string, string>)['X-House-Key']).toBe('k')
  })
  it.each([...writes, ['cancelFade', (k: string) => cancelFade(k, 'l 1'), '', '', null] as (typeof writes)[number]])(
    '%s : 401 et erreurs HTTP',
    async (_n, call) => {
      stubFetch(() => reply({}, 401))
      await expect(call('k')).rejects.toMatchObject({ status: 401 })
      stubFetch(() => reply({}, 502))
      await expect(call('k')).rejects.toMatchObject({ status: 502 })
    },
  )
  it('closeShutterHalf : POST sans corps, rend le volet ; 401 et erreurs HTTP', async () => {
    const spy = stubFetch(() => reply({ id: 'a 1', halfRunning: true }))
    expect(await closeShutterHalf('k', 'a 1')).toEqual({ id: 'a 1', halfRunning: true })
    expect(spy).toHaveBeenCalledWith('/shutters/a%201/half', { method: 'POST', headers: { 'X-House-Key': 'k' } })
    stubFetch(() => reply({}, 401))
    await expect(closeShutterHalf('k', 'a')).rejects.toMatchObject({ status: 401 })
    stubFetch(() => reply({}, 409))
    await expect(closeShutterHalf('k', 'a')).rejects.toMatchObject({ status: 409 })
  })
  it('saveHeating : le texte du refus de l’API, ou un message par défaut', async () => {
    stubFetch(() => reply({ error: 'minutes must be an integer from 1 to 120' }, 400))
    await expect(saveHeating('k', { minutes: 0 })).rejects.toMatchObject({ status: 400, message: 'minutes must be an integer from 1 to 120' })
    stubFetch(() => reply('oups', 400))
    await expect(saveHeating('k', {})).rejects.toMatchObject({ status: 400, message: '/plug/heating : HTTP 400' })
    stubFetch(() => reply({ error: 3 }, 400))
    await expect(saveHeating('k', {})).rejects.toMatchObject({ message: '/plug/heating : HTTP 400' })
  })
  it('setClipNote rend la note gardée par l’API', async () => {
    stubFetch(() => reply({ id: 'a', note: 'renard' }))
    expect(await setClipNote('k', 'a', ' renard ')).toBe('renard')
  })
  it('cancelFade envoie DELETE sans corps', async () => {
    const spy = stubFetch(() => reply({ fading: false, ends_at: null }))
    await cancelFade('k', 'l1')
    expect(spy.mock.calls[0][1]?.method).toBe('DELETE')
    expect(spy.mock.calls[0][1]?.body).toBeUndefined()
  })
  it('startRecording / stopRecording', async () => {
    const spy = stubFetch(() => reply({}))
    await startRecording('k', 'c 1')
    await stopRecording('k', 'c 1')
    expect(spy.mock.calls.map(([p, i]) => [p, i?.method])).toEqual([
      ['/record/c%201', 'POST'],
      ['/record/c%201', 'DELETE'],
    ])
    stubFetch(() => reply({}, 401))
    await expect(startRecording('k', 'c')).rejects.toMatchObject({ status: 401 })
    stubFetch(() => reply({}, 500))
    await expect(stopRecording('k', 'c')).rejects.toMatchObject({ status: 500 })
  })
})

describe('clearStoredKey', () => {
  it('efface l’ancienne clé de l’onglet', () => {
    sessionStorage.setItem(KEY_STORAGE, 'x')
    clearStoredKey()
    expect(sessionStorage.getItem(KEY_STORAGE)).toBeNull()
  })
  it('ignore un stockage indisponible', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('privé')
    })
    expect(() => clearStoredKey()).not.toThrow()
  })
})
