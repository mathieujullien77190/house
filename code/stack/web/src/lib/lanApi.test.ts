import { reply, stubFetch } from '@/test/fetch'
import { fetchLanState, fetchLanToken, LAN_KEY_STORAGE, LanError, lanStreamUrl, readLanKey, sendLanAc, sendLanLight, sendLanShutter } from './lanApi'

afterEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('readLanKey', () => {
  it('garde la clé de l’adresse et l’efface de la barre', () => {
    window.history.replaceState(null, '', '/chezmatou?k=abc')
    expect(readLanKey()).toBe('abc')
    expect(sessionStorage.getItem(LAN_KEY_STORAGE)).toBe('abc')
    expect(window.location.search).toBe('')
  })
  it('sans clé dans l’adresse : celle de l’onglet, sinon null', () => {
    expect(readLanKey()).toBeNull()
    sessionStorage.setItem(LAN_KEY_STORAGE, 'gardee')
    expect(readLanKey()).toBe('gardee')
  })
  it('stockage refusé : la clé de l’adresse quand même', () => {
    window.history.replaceState(null, '', '/chezmatou?k=abc')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('refusé')
    })
    expect(readLanKey()).toBe('abc')
  })
})

describe('appels', () => {
  it('envoie la clé en en-tête et rend le JSON', async () => {
    const spy = stubFetch(() => reply({ cameras: null }))
    expect(await fetchLanState('k')).toEqual({ cameras: null })
    expect(spy.mock.calls[0][0]).toBe('/lan/state')
    expect(spy.mock.calls[0][1]?.headers).toEqual({ 'X-Lan-Key': 'k' })
  })
  it('rend le jeton', async () => {
    stubFetch(() => reply({ token: 'jeton', expiresIn: 60 }))
    expect(await fetchLanToken('k')).toBe('jeton')
  })
  it('les ordres : adresse, méthode et corps', async () => {
    const spy = stubFetch(() => reply({}))
    await sendLanShutter('k', 'a b', 'up')
    await sendLanLight('k', '5', true)
    await sendLanAc('k', 'salon', { on: true, mode: 'heat', temperature: 21, fan: 'auto', vane: '1' })
    const [shutter, light, ac] = spy.mock.calls
    expect(shutter[0]).toBe('/lan/shutters/a%20b')
    expect(shutter[1]).toMatchObject({ method: 'POST', body: '{"command":"up"}' })
    expect(light[0]).toBe('/lan/lights/5')
    expect(light[1]).toMatchObject({ method: 'PUT', body: '{"on":true}' })
    expect(ac[0]).toBe('/lan/ac/salon')
    expect(JSON.parse(String(ac[1]?.body))).toEqual({ on: true, mode: 'heat', temperature: 21, fan: 'auto' })
  })
  it('l’adresse du direct : léger, 4K, mobile', () => {
    expect(lanStreamUrl('cam 1', 't/1')).toBe('/lan/stream/cam%201?t=t%2F1')
    expect(lanStreamUrl('c', 't', true, true)).toBe('/lan/stream/c?t=t&quality=hd&screen=mobile')
  })
})

describe('erreurs', () => {
  const problem = async (status: number, body: unknown) => {
    stubFetch(() => reply(body, status))
    return fetchLanState('k').catch((error: LanError) => error.problem)
  }
  it('traduit le statut en problème', async () => {
    expect(await problem(401, { error: 'clé refusée' })).toBe('locked')
    expect(await problem(403, { error: 'désactivé' })).toBe('disabled')
    expect(await problem(403, { error: 'réseau local seulement' })).toBe('outside')
    expect(await problem(503, {})).toBe('unconfigured')
    expect(await problem(500, 'pas du json')).toBe('unreachable')
  })
  it('réseau coupé : injoignable', async () => {
    stubFetch(() => {
      throw new Error('réseau')
    })
    await expect(fetchLanState('k')).rejects.toMatchObject({ problem: 'unreachable' })
  })
})
