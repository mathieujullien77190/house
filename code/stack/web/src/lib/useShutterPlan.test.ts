import { act, renderHook } from '@testing-library/react'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { flush } from '@/test/fetch'
import type { ShutterInfo } from '@/types'
import { shutterItemId, useShutterPlan } from './useShutterPlan'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchShutters: vi.fn(),
  sendShutter: vi.fn(),
}))
const api = await import('./api')

const shutter = (id: string, name: string, over: Partial<ShutterInfo> = {}): ShutterInfo => ({
  id,
  name,
  lastCommand: null,
  lastAt: null,
  auto: null,
  ...over,
})
const state = (...shutters: ShutterInfo[]) => ({ mock: false, shutters })

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(api.fetchShutters).mockResolvedValue(state(shutter('1', 'Volet cuisine'), shutter('2', 'Volet chambre'), shutter('3', 'Volet bureau', { lastCommand: 'down' })))
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

const tick = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('useShutterPlan', () => {
  it('la clé du plan', () => {
    expect(shutterItemId('1')).toBe('shutter-1')
  })

  it('désactivé : rien, aucun appel', async () => {
    const { result } = renderHook(() => useShutterPlan('k', {}, false))
    await tick(10_000)
    expect(result.current.shutters).toEqual([])
    expect(api.fetchShutters).not.toHaveBeenCalled()
  })

  it('place la cuisine à sa place de départ, les autres seulement si le plan les a placés', async () => {
    const { result } = renderHook(() => useShutterPlan('k', { 'shutter-3': { x: 5, y: 6 } }, true))
    expect(result.current.shutters).toEqual([])
    await tick()
    const byId = Object.fromEntries(result.current.shutters.map((item) => [item.id, item]))
    expect(byId['1']).toMatchObject({ ...fromHousePlan(315, 8), closed: false })
    expect(byId['1'].label).toMatch(/^Volet cuisine · /)
    expect(byId['2']).toBeUndefined()
    expect(byId['3']).toMatchObject({ x: 5, y: 6, closed: true })
  })

  it('relit toutes les 10 s, garde les dernières en cas d’erreur, s’arrête au démontage', async () => {
    const { result, unmount } = renderHook(() => useShutterPlan('k', {}, true))
    await tick()
    vi.mocked(api.fetchShutters).mockRejectedValue(new Error('x'))
    await tick(10_000)
    expect(result.current.shutters).toHaveLength(1)
    unmount()
    vi.mocked(api.fetchShutters).mockClear()
    await tick(20_000)
    expect(api.fetchShutters).not.toHaveBeenCalled()
  })

  it('ignore une réponse arrivée après le démontage', async () => {
    let ok: (value: ReturnType<typeof state>) => void = () => undefined
    vi.mocked(api.fetchShutters).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    const { result, unmount } = renderHook(() => useShutterPlan('k', {}, true))
    unmount()
    await act(async () => {
      ok(state(shutter('1', 'Volet cuisine')))
      await flush()
    })
    expect(result.current.shutters).toEqual([])
  })

  it('un clic descend un volet ouvert, monte un volet fermé, et remplace l’état par la réponse', async () => {
    vi.mocked(api.sendShutter)
      .mockResolvedValueOnce(shutter('1', 'Volet cuisine', { lastCommand: 'down' }))
      .mockResolvedValueOnce(shutter('3', 'Volet bureau', { lastCommand: 'up' }))
    const { result } = renderHook(() => useShutterPlan('k', { 'shutter-3': { x: 5, y: 6 } }, true))
    await tick()
    act(() => result.current.toggle('1'))
    await tick()
    expect(api.sendShutter).toHaveBeenLastCalledWith('k', '1', 'down')
    expect(result.current.shutters.find((item) => item.id === '1')?.closed).toBe(true)
    act(() => result.current.toggle('3'))
    await tick()
    expect(api.sendShutter).toHaveBeenLastCalledWith('k', '3', 'up')
    expect(result.current.shutters.find((item) => item.id === '3')?.closed).toBe(false)
  })

  it('un volet inconnu ne fait rien, un échec laisse l’écran tel quel', async () => {
    vi.mocked(api.sendShutter).mockRejectedValueOnce(new Error('x'))
    const { result } = renderHook(() => useShutterPlan('k', {}, true))
    await tick()
    act(() => result.current.toggle('inconnu'))
    expect(api.sendShutter).not.toHaveBeenCalled()
    const before = result.current.shutters
    act(() => result.current.toggle('1'))
    await tick()
    expect(result.current.shutters).toEqual(before)
  })
})
