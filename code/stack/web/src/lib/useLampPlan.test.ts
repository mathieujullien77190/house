import { act, renderHook } from '@testing-library/react'
import { PLAN_LAMP_POSITION } from '@/components/Lights/constants'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { flush } from '@/test/fetch'
import type { HueRoom } from '@/types'
import { useLampPlan } from './useLampPlan'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchLights: vi.fn(),
  fetchLampPositions: vi.fn(),
  setHue: vi.fn(),
}))
const api = await import('./api')

const light = (id: string, over: Record<string, unknown> = {}) => ({ id, name: `L${id}`, on: false, bri: 100, reachable: true, ...over })
const rooms = (...lights: ReturnType<typeof light>[]): HueRoom[] => [{ id: 'r', name: 'R', on: false, bri: null, lights } as HueRoom]

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  vi.mocked(api.fetchLampPositions).mockResolvedValue({})
  vi.mocked(api.fetchLights).mockResolvedValue(rooms(light('15'), light('26', { on: true }), light('999')))
})
afterEach(() => vi.useRealTimers())

const tick = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('useLampPlan', () => {
  it('désactivé : rien, aucun appel', async () => {
    const { result } = renderHook(() => useLampPlan('k', {}, false))
    await tick(10_000)
    expect(result.current.lamps).toEqual([])
    expect(api.fetchLights).not.toHaveBeenCalled()
    expect(api.fetchLampPositions).not.toHaveBeenCalled()
  })

  it('place les lampes : plan de l’API, cage, ancien plan, sinon en attente', async () => {
    const { result } = renderHook(() => useLampPlan('k', { '15': { x: 5, y: 6 } }, true))
    expect(result.current.lamps).toEqual([])
    await tick()
    const byId = Object.fromEntries(result.current.lamps.map((lamp) => [lamp.id, lamp]))
    expect(byId['15']).toMatchObject({ x: 5, y: 6, indoor: true })
    expect(byId['26']).toMatchObject({ ...PLAN_LAMP_POSITION, on: true })
    expect(byId['999']).toMatchObject({ waiting: true })
  })

  it('prend l’ancienne position quand le plan n’en a pas', async () => {
    vi.mocked(api.fetchLampPositions).mockResolvedValue({ '15': { x: 100, y: 50 } })
    const { result } = renderHook(() => useLampPlan('k', {}, true))
    await tick()
    expect(result.current.lamps.find((lamp) => lamp.id === '15')).toMatchObject(fromHousePlan(100, 50))
  })

  it('relit les lampes toutes les 5 s ; une erreur garde les dernières', async () => {
    const { result } = renderHook(() => useLampPlan('k', {}, true))
    await tick()
    expect(api.fetchLights).toHaveBeenCalledTimes(1)
    vi.mocked(api.fetchLights).mockResolvedValue(rooms(light('15', { on: true })))
    await tick(5000)
    expect(result.current.lamps).toHaveLength(1)
    expect(result.current.lamps[0]).toMatchObject({ id: '15', on: true })
    vi.mocked(api.fetchLights).mockRejectedValue(new Error('x'))
    await tick(5000)
    expect(result.current.lamps).toHaveLength(1)
  })

  it('arrête de relire au démontage et ignore une réponse tardive', async () => {
    let ok: (r: HueRoom[]) => void = () => undefined
    vi.mocked(api.fetchLights).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    const { result, unmount } = renderHook(() => useLampPlan('k', {}, true))
    unmount()
    await act(async () => {
      ok(rooms(light('15')))
      await flush()
    })
    expect(result.current.lamps).toEqual([])
    vi.mocked(api.fetchLights).mockClear()
    await tick(20_000)
    expect(api.fetchLights).not.toHaveBeenCalled()
  })

  it('toucher une lampe joignable l’allume ou l’éteint, et l’écran suit la réponse', async () => {
    vi.mocked(api.setHue).mockResolvedValue(rooms(light('15', { on: true }), light('26', { on: true }), light('999')))
    const { result } = renderHook(() => useLampPlan('k', {}, true))
    await tick()
    act(() => result.current.toggle('15'))
    await tick()
    expect(api.setHue).toHaveBeenCalledWith('k', 'lights', '15', { on: true })
    expect(result.current.lamps.find((lamp) => lamp.id === '15')?.on).toBe(true)
    // Une lampe allumée s'éteint.
    act(() => result.current.toggle('26'))
    expect(api.setHue).toHaveBeenLastCalledWith('k', 'lights', '26', { on: false })
    await tick()
  })

  it('une lampe injoignable ou inconnue ne fait rien', async () => {
    vi.mocked(api.fetchLights).mockResolvedValue(rooms(light('15', { reachable: false })))
    const { result } = renderHook(() => useLampPlan('k', {}, true))
    await tick()
    act(() => result.current.toggle('15'))
    act(() => result.current.toggle('inconnue'))
    expect(api.setHue).not.toHaveBeenCalled()
  })

  it('un échec du pont laisse l’écran tel quel', async () => {
    const { result } = renderHook(() => useLampPlan('k', {}, true))
    await tick()
    const before = result.current.lamps
    vi.mocked(api.setHue).mockRejectedValueOnce(new Error('x'))
    act(() => result.current.toggle('15'))
    await tick()
    expect(result.current.lamps).toEqual(before)
  })
})
