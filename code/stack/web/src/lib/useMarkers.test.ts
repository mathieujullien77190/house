import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { defaultMarker, MAX_PLACE, MIN_PLACE, markersFor, useMarkers } from './useMarkers'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchMarkers: vi.fn(),
  putMarkers: vi.fn(),
}))
const api = await import('./api')

const settle = async () => {
  await act(async () => {
    await flush()
  })
}

beforeEach(() => {
  vi.mocked(api.fetchMarkers).mockReset().mockResolvedValue({})
  vi.mocked(api.putMarkers).mockReset().mockResolvedValue(undefined)
})

describe('defaultMarker et markersFor', () => {
  it('les repères de départ sont alignés en haut, répartis sur la largeur', () => {
    expect(defaultMarker('b', 0, 3)).toEqual({ target: 'b', x: 0.25, y: 0.14 })
    expect(defaultMarker('d', 2, 3)).toEqual({ target: 'd', x: 0.75, y: 0.14 })
    expect(defaultMarker('c', 0, 6).x).toBe(0.1429)
  })
  it('sans liste enregistrée : un repère par autre caméra, déplacé s’il l’est', () => {
    expect(markersFor(['b', 'c'], null, {})).toEqual([defaultMarker('b', 0, 2), defaultMarker('c', 1, 2)])
    expect(markersFor(['b', 'c'], null, { c: { target: 'c', x: 0.9, y: 0.9 } })).toEqual([defaultMarker('b', 0, 2), { target: 'c', x: 0.9, y: 0.9 }])
  })
  it('avec une liste : seulement ceux de la liste dont la caméra existe encore', () => {
    const saved = [
      { target: 'b', x: 0.1, y: 0.2 },
      { target: 'gone', x: 0.3, y: 0.3 },
      { target: 'c', x: 0.5, y: 0.5 },
    ]
    expect(markersFor(['b', 'c'], saved, { b: { target: 'b', x: 0.7, y: 0.7 } })).toEqual([
      { target: 'b', x: 0.7, y: 0.7 },
      { target: 'c', x: 0.5, y: 0.5 },
    ])
    expect(markersFor(['b'], [], {})).toEqual([])
  })
})

describe('useMarkers', () => {
  it('sans rien d’enregistré : les places de départ', async () => {
    const { result } = renderHook(() => useMarkers('k', 'a', ['b', 'c']))
    await settle()
    expect(api.fetchMarkers).toHaveBeenCalledWith('k')
    expect(result.current.markers).toEqual([defaultMarker('b', 0, 2), defaultMarker('c', 1, 2)])
  })
  it('lit la liste enregistrée de la caméra', async () => {
    vi.mocked(api.fetchMarkers).mockResolvedValue({ a: [{ target: 'c', x: 0.4, y: 0.6 }] })
    const { result } = renderHook(() => useMarkers('k', 'a', ['b', 'c']))
    await settle()
    expect(result.current.markers).toEqual([{ target: 'c', x: 0.4, y: 0.6 }])
  })
  it('une lecture qui échoue garde les places de départ', async () => {
    vi.mocked(api.fetchMarkers).mockRejectedValue(new Error('réseau'))
    const { result } = renderHook(() => useMarkers('k', 'a', ['b']))
    await settle()
    expect(result.current.markers).toEqual([defaultMarker('b', 0, 1)])
  })
  it('une lecture qui arrive après le démontage est ignorée', async () => {
    let resolve: (value: Record<string, never>) => void = () => undefined
    vi.mocked(api.fetchMarkers).mockReturnValue(new Promise((done) => (resolve = done)))
    const { unmount } = renderHook(() => useMarkers('k', 'a', ['b']))
    unmount()
    resolve({})
    await settle()
    expect(api.fetchMarkers).toHaveBeenCalledTimes(1)
  })
  it('move : déplace pendant le glisser, borné, sans rien enregistrer', async () => {
    const { result } = renderHook(() => useMarkers('k', 'a', ['b', 'c']))
    await settle()
    act(() => result.current.move('b', 0.5, 0.6))
    expect(result.current.markers[0]).toEqual({ target: 'b', x: 0.5, y: 0.6 })
    act(() => result.current.move('c', 9, -9))
    expect(result.current.markers[1]).toEqual({ target: 'c', x: MAX_PLACE, y: MIN_PLACE })
    expect(result.current.markers[0]).toEqual({ target: 'b', x: 0.5, y: 0.6 })
    expect(api.putMarkers).not.toHaveBeenCalled()
  })
  it('commit : enregistre toutes les places, arrondies', async () => {
    const { result } = renderHook(() => useMarkers('k', 'a', ['b', 'c']))
    await settle()
    act(() => result.current.move('b', 0.123456, 0.5))
    act(() => result.current.commit())
    const list = [
      { target: 'b', x: 0.1235, y: 0.5 },
      { target: 'c', x: 0.6667, y: 0.14 },
    ]
    expect(api.putMarkers).toHaveBeenCalledWith('k', 'a', list)
    expect(result.current.markers).toEqual(list)
  })
  it('commit : un enregistrement qui échoue ne casse rien', async () => {
    vi.mocked(api.putMarkers).mockRejectedValue(new Error('réseau'))
    const { result } = renderHook(() => useMarkers('k', 'a', ['b']))
    await settle()
    act(() => result.current.commit())
    await settle()
    expect(result.current.markers).toHaveLength(1)
  })
  it('remove : retire le repère et enregistre la liste restante', async () => {
    const { result } = renderHook(() => useMarkers('k', 'a', ['b', 'c']))
    await settle()
    act(() => result.current.remove('b'))
    expect(result.current.markers).toEqual([defaultMarker('c', 1, 2)])
    expect(api.putMarkers).toHaveBeenCalledWith('k', 'a', [defaultMarker('c', 1, 2)])
  })
  it('remove : un enregistrement qui échoue ne casse rien', async () => {
    vi.mocked(api.putMarkers).mockRejectedValue(new Error('réseau'))
    const { result } = renderHook(() => useMarkers('k', 'a', ['b']))
    await settle()
    act(() => result.current.remove('b'))
    await settle()
    expect(result.current.markers).toEqual([])
  })
  it('en changeant de caméra, les places de la précédente ne s’appliquent plus', async () => {
    vi.mocked(api.fetchMarkers).mockResolvedValue({ a: [{ target: 'b', x: 0.4, y: 0.6 }] })
    const { result, rerender } = renderHook(({ camera, others }) => useMarkers('k', camera, others), { initialProps: { camera: 'a', others: ['b'] } })
    await settle()
    act(() => result.current.move('b', 0.9, 0.9))
    expect(result.current.markers).toEqual([{ target: 'b', x: 0.9, y: 0.9 }])
    vi.mocked(api.fetchMarkers).mockResolvedValue({})
    rerender({ camera: 'z', others: ['b'] })
    expect(result.current.markers).toEqual([defaultMarker('b', 0, 1)])
    await settle()
    expect(result.current.markers).toEqual([defaultMarker('b', 0, 1)])
    // un déplacement sur la nouvelle caméra repart d’un état vide
    act(() => result.current.move('b', 0.2, 0.2))
    expect(result.current.markers).toEqual([{ target: 'b', x: 0.2, y: 0.2 }])
  })
})
