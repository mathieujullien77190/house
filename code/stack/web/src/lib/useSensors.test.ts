import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { useSensors } from './useSensors'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchSensors: vi.fn(),
}))
const api = await import('./api')

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('useSensors', () => {
  it('inactif : liste vide', async () => {
    const { result } = renderHook(() => useSensors('k', false))
    await tick(60_000)
    expect(result.current).toEqual([])
  })
  it('lit, garde le dernier état en cas d’échec', async () => {
    vi.mocked(api.fetchSensors).mockResolvedValue([{ id: '1' } as never])
    const { result, unmount } = renderHook(() => useSensors('k', true))
    await tick(0)
    expect(result.current).toHaveLength(1)
    vi.mocked(api.fetchSensors).mockRejectedValue(new Error('x'))
    await tick(30_000)
    expect(result.current).toHaveLength(1)
    unmount()
  })
  it('ignore une réponse après démontage', async () => {
    let ok: (s: never[]) => void = () => undefined
    vi.mocked(api.fetchSensors).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    const { result, unmount } = renderHook(() => useSensors('k', true))
    unmount()
    await act(async () => {
      ok([{ id: '1' } as never])
      await flush()
    })
    expect(result.current).toEqual([])
  })
})
