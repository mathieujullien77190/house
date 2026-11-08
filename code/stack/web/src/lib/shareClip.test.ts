import { reply, stubFetch } from '@/test/fetch'
import { shareClip } from './shareClip'

afterEach(() => {
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
})

const setNavigator = (canShare: unknown, share?: unknown) => {
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true })
  Object.defineProperty(navigator, 'share', { value: share, configurable: true })
}

describe('shareClip', () => {
  it('lève une erreur si la vidéo ne se charge pas', async () => {
    stubFetch(() => reply('', 404))
    await expect(shareClip('/clips/1', 'n', 't')).rejects.toThrow('/clips/1 : HTTP 404')
  })
  it('ouvre le menu de partage quand le fichier peut être partagé', async () => {
    stubFetch(() => reply('video'))
    const share = vi.fn().mockResolvedValue(undefined)
    setNavigator(() => true, share)
    expect(await shareClip('/c', 'nom', 'titre')).toBe('shared')
    expect(share.mock.calls[0][0].files[0].name).toBe('nom.mp4')
    expect(share.mock.calls[0][0].title).toBe('titre')
  })
  it('un menu fermé sans choisir est « cancelled »', async () => {
    stubFetch(() => reply('video'))
    setNavigator(() => true, vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')))
    expect(await shareClip('/c', 'n', 't')).toBe('cancelled')
  })
  it('une autre erreur de partage est relancée', async () => {
    stubFetch(() => reply('video'))
    setNavigator(() => true, vi.fn().mockRejectedValue(new Error('boum')))
    await expect(shareClip('/c', 'n', 't')).rejects.toThrow('boum')
    setNavigator(() => true, vi.fn().mockRejectedValue(new DOMException('x', 'NotAllowedError')))
    await expect(shareClip('/c', 'n', 't')).rejects.toThrow()
  })
  it.each([[undefined], [() => false]])('sinon télécharge le fichier (%s)', async (canShare) => {
    vi.useFakeTimers()
    stubFetch(() => reply('video'))
    setNavigator(canShare)
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const result = await shareClip('/c', 'n', 't')
    expect(result).toBe('downloaded')
    expect(click).toHaveBeenCalled()
    vi.advanceTimersByTime(10_000)
    expect(revoke).toHaveBeenCalledWith('blob:x')
    vi.useRealTimers()
  })
})
