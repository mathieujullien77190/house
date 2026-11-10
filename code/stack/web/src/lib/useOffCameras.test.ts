import { act, renderHook } from '@testing-library/react'
import type { CameraPower } from '@/types'
import { flush } from '@/test/fetch'
import * as api from '@/lib/api'
import { useOffCameras } from './useOffCameras'

vi.mock('@/lib/api', () => ({ fetchPower: vi.fn() }))

const power = (camera: string, on: boolean): CameraPower => ({ camera, port: 3, on }) as CameraPower
const tick = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('useOffCameras', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('liste les caméras dont le PoE est coupé, relues toutes les 10 s ; un échec garde le dernier état', async () => {
    vi.mocked(api.fetchPower)
      .mockResolvedValueOnce([power('a', true), power('b', false)])
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValue([power('a', false), power('b', false)])
    const { result } = renderHook(() => useOffCameras('k'))
    expect(result.current).toEqual([])
    await tick()
    expect(result.current).toEqual(['b'])
    await tick(10_000)
    expect(result.current).toEqual(['b'])
    await tick(10_000)
    expect(result.current).toEqual(['a', 'b'])
  })

  it('désactivé : rien, aucun appel', async () => {
    renderHook(() => useOffCameras('k', false))
    await tick(30_000)
    expect(api.fetchPower).not.toHaveBeenCalled()
  })

  it('une réponse après le démontage est ignorée', async () => {
    let resolve: (list: CameraPower[]) => void = () => undefined
    vi.mocked(api.fetchPower).mockReturnValue(new Promise<CameraPower[]>((done) => (resolve = done)))
    const { result, unmount } = renderHook(() => useOffCameras('k'))
    unmount()
    await act(async () => resolve([power('a', false)]))
    expect(result.current).toEqual([])
  })
})
