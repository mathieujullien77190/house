import { act, renderHook } from '@testing-library/react'
import { LEGACY_STORAGE_KEY } from '@/components/Lights/constants'
import { flush } from '@/test/fetch'
import { useLegacyPositions } from './useLegacyPositions'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchLampPositions: vi.fn(),
}))
const api = await import('./api')

beforeEach(() => localStorage.clear())

describe('useLegacyPositions', () => {
  it('commence par la copie du navigateur', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ '1': { x: 1, y: 1 } }))
    vi.mocked(api.fetchLampPositions).mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useLegacyPositions('k'))
    expect(result.current).toEqual({ '1': { x: 1, y: 1 } })
  })

  it('celles de l’API passent avant la copie du navigateur, qui complète ; rien n’est écrit ni effacé', async () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ '1': { x: 1, y: 1 }, '2': { x: 2, y: 2 } }))
    vi.mocked(api.fetchLampPositions).mockResolvedValue({ '1': { x: 9, y: 9 } })
    const { result } = renderHook(() => useLegacyPositions('k'))
    await act(flush)
    expect(api.fetchLampPositions).toHaveBeenCalledWith('k')
    expect(result.current).toEqual({ '1': { x: 9, y: 9 }, '2': { x: 2, y: 2 } })
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull()
  })

  it('désactivé : ne lit pas l’API', async () => {
    const { result } = renderHook(() => useLegacyPositions('k', false))
    await act(flush)
    expect(api.fetchLampPositions).not.toHaveBeenCalled()
    expect(result.current).toEqual({})
  })

  it('une API qui échoue garde la copie du navigateur', async () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ '2': { x: 2, y: 2 } }))
    vi.mocked(api.fetchLampPositions).mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useLegacyPositions('k'))
    await act(flush)
    expect(result.current).toEqual({ '2': { x: 2, y: 2 } })
  })

  it('ignore une réponse arrivée après le démontage', async () => {
    let ok: (p: Record<string, { x: number; y: number }>) => void = () => undefined
    vi.mocked(api.fetchLampPositions).mockReturnValue(new Promise((resolve) => (ok = resolve)))
    const { result, unmount } = renderHook(() => useLegacyPositions('k'))
    unmount()
    await act(async () => {
      ok({ '1': { x: 9, y: 9 } })
      await flush()
    })
    expect(result.current).toEqual({})
  })
})
