import { reply, stubFetch } from '@/test/fetch'
import { fetchBox, fetchBoxGuests, fetchGuestWifi, setBoxExcluded, setBoxWifi } from './api'

describe('Freebox', () => {
  it('les lectures portent la clé et le chemin attendus', async () => {
    const spy = stubFetch(() => reply({ ok: true }))
    await fetchBox('k')
    await fetchBoxGuests('k')
    await fetchBoxGuests('k', 5)
    await fetchGuestWifi('k')
    expect(spy.mock.calls.map(([path]) => path)).toEqual(['/box', '/box/guests?limit=100', '/box/guests?limit=5', '/box/guest-wifi'])
    expect((spy.mock.calls[0][1]?.headers as Record<string, string>)['X-House-Key']).toBe('k')
  })

  it('setBoxWifi envoie l’ordre et rend le nouvel état ; 401 et autres statuts sont des ApiError', async () => {
    const spy = stubFetch(() => reply({ enabled: false }))
    expect(await setBoxWifi('k', false)).toEqual({ enabled: false })
    expect([spy.mock.calls[0][0], spy.mock.calls[0][1]?.method, spy.mock.calls[0][1]?.body]).toEqual(['/box/wifi', 'PUT', JSON.stringify({ enabled: false })])
    stubFetch(() => reply({}, 401))
    await expect(setBoxWifi('k', true)).rejects.toMatchObject({ status: 401 })
    stubFetch(() => reply({}, 502))
    await expect(setBoxWifi('k', true)).rejects.toMatchObject({ status: 502 })
  })

  it('setBoxExcluded envoie l’exclusion de la MAC ; 401 et autres statuts sont des ApiError', async () => {
    const spy = stubFetch(() => reply({}))
    await setBoxExcluded('k', 'AA:BB', true)
    expect([spy.mock.calls[0][0], spy.mock.calls[0][1]?.method, spy.mock.calls[0][1]?.body]).toEqual([
      '/box/guests/AA%3ABB/exclude',
      'PUT',
      JSON.stringify({ excluded: true }),
    ])
    stubFetch(() => reply({}, 401))
    await expect(setBoxExcluded('k', 'AA', false)).rejects.toMatchObject({ status: 401 })
    stubFetch(() => reply({}, 409))
    await expect(setBoxExcluded('k', 'AA', false)).rejects.toMatchObject({ status: 409 })
  })
})
