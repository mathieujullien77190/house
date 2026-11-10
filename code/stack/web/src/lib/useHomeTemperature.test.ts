import { act, renderHook } from '@testing-library/react'
import type { AcUnit } from '@/types'
import { flush } from '@/test/fetch'
import * as api from '@/lib/api'
import { useHomeTemperature } from './useHomeTemperature'

vi.mock('@/lib/api', () => ({ fetchAc: vi.fn() }))

const unit = (id: string, roomTemp: number | null, reachable = true): AcUnit => ({ id, reachable, roomTemp }) as AcUnit
const tick = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('useHomeTemperature', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lit la température de la clim du salon, relue toutes les 30 s ; null si elle manque ou ne répond pas', async () => {
    vi.mocked(api.fetchAc)
      .mockResolvedValueOnce([unit('chambre', 18), unit('salon', 21.5)])
      .mockResolvedValueOnce([unit('salon', 22, false)])
      .mockResolvedValueOnce([unit('chambre', 18)])
      .mockResolvedValue([unit('salon', null)])
    const { result } = renderHook(() => useHomeTemperature('k'))
    expect(result.current).toBeNull()
    await tick()
    expect(result.current).toBe(21.5)
    await tick(30_000)
    expect(result.current).toBeNull()
    await tick(30_000)
    expect(result.current).toBeNull()
    await tick(30_000)
    expect(result.current).toBeNull()
  })

  it('un échec de lecture efface la température', async () => {
    vi.mocked(api.fetchAc).mockResolvedValueOnce([unit('salon', 20)]).mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useHomeTemperature('k'))
    await tick()
    expect(result.current).toBe(20)
    await tick(30_000)
    expect(result.current).toBeNull()
  })

  it('une réponse (ou un échec) après le démontage est ignorée, et la lecture s’arrête', async () => {
    let resolve: (list: AcUnit[]) => void = () => undefined
    let reject: (error: Error) => void = () => undefined
    vi.mocked(api.fetchAc)
      .mockReturnValueOnce(new Promise<AcUnit[]>((done) => (resolve = done)))
      .mockReturnValueOnce(new Promise<AcUnit[]>((_, fail) => (reject = fail)))
    const first = renderHook(() => useHomeTemperature('k'))
    first.unmount()
    await act(async () => resolve([unit('salon', 20)]))
    expect(first.result.current).toBeNull()
    const second = renderHook(() => useHomeTemperature('k'))
    second.unmount()
    await act(async () => reject(new Error('x')))
    expect(second.result.current).toBeNull()
    vi.mocked(api.fetchAc).mockClear()
    await tick(60_000)
    expect(api.fetchAc).not.toHaveBeenCalled()
  })
})
