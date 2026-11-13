import { reply, stubFetch } from '@/test/fetch'
import { fetchTv, finishTvPairing, forgetTvPairing, sendTvKey, startTvPairing } from './api'

describe('télécommande TV', () => {
  it('fetchTv lit /tv', async () => {
    stubFetch(() => reply({ configured: true, paired: false, online: null }))
    expect(await fetchTv('k')).toEqual({ configured: true, paired: false, online: null })
  })

  it('les envois portent la clé, la méthode et le corps attendus', async () => {
    const spy = stubFetch(() => reply({}))
    await sendTvKey('k', 'vol_inc', true)
    await startTvPairing('k')
    await finishTvPairing('k', '1A2B3C')
    await forgetTvPairing('k')
    const calls = spy.mock.calls.map(([path, init]) => [path, init?.method, init?.body])
    expect(calls).toEqual([
      ['/tv/key', 'POST', JSON.stringify({ key: 'vol_inc', long: true })],
      ['/tv/pair/start', 'POST', undefined],
      ['/tv/pair/code', 'POST', JSON.stringify({ code: '1A2B3C' })],
      ['/tv/pair', 'DELETE', undefined],
    ])
    expect((spy.mock.calls[0][1]?.headers as Record<string, string>)['X-House-Key']).toBe('k')
    expect((spy.mock.calls[1][1]?.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('401 devient « clé refusée », autre statut une ApiError', async () => {
    stubFetch(() => reply({}, 401))
    await expect(sendTvKey('k', 'ok', false)).rejects.toMatchObject({ status: 401 })
    stubFetch(() => reply({}, 422))
    await expect(finishTvPairing('k', 'AAAAAA')).rejects.toMatchObject({ status: 422 })
  })
})
