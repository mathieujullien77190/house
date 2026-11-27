import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { levelOf, LEVEL_SHOWN_MS, posOf, SEND_DELAY_MS, useOpticalZoom } from './useOpticalZoom'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchCameraZoom: vi.fn(),
  setCameraZoom: vi.fn(),
}))
const api = await import('./api')

const RANGE = { min: 0, max: 28 }

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(api.fetchCameraZoom).mockReset().mockResolvedValue({ pos: 0, ...RANGE })
  vi.mocked(api.setCameraZoom).mockReset().mockResolvedValue({ pos: 0, ...RANGE })
})
afterEach(() => vi.useRealTimers())

const tick = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

const open = async (enabled = true) => {
  const view = renderHook((props: { enabled: boolean }) => useOpticalZoom('k', 'pommier', props.enabled), { initialProps: { enabled } })
  await tick()
  return view
}

describe('levelOf et posOf', () => {
  it('la position de la caméra sur l’échelle ×1 à ×5, et retour', () => {
    expect(levelOf(0, RANGE)).toBe(1)
    expect(levelOf(28, RANGE)).toBe(5)
    expect(levelOf(14, RANGE)).toBe(3)
    expect(levelOf(15, { min: 10, max: 20 })).toBe(3)
    expect(posOf(1, RANGE)).toBe(0)
    expect(posOf(5, RANGE)).toBe(28)
    expect(posOf(3.07, RANGE)).toBe(14)
    expect(posOf(3, { min: 10, max: 20 })).toBe(15)
  })
})

describe('useOpticalZoom', () => {
  it('coupé : rien n’est demandé, pas d’étage', async () => {
    const { result } = await open(false)
    expect(api.fetchCameraZoom).not.toHaveBeenCalled()
    expect(result.current).toEqual({ stage: null, level: null, changing: false })
  })

  it('lit la position à l’ouverture ; la caméra sans zoom n’a pas d’étage', async () => {
    vi.mocked(api.fetchCameraZoom).mockResolvedValue({ pos: 14, ...RANGE })
    const { result } = await open()
    expect(api.fetchCameraZoom).toHaveBeenCalledWith('k', 'pommier')
    expect(result.current.level).toBe(3)
    expect(result.current.stage).not.toBeNull()
    expect(result.current.changing).toBe(false)

    vi.mocked(api.fetchCameraZoom).mockRejectedValue(new Error('404'))
    const none = await open()
    expect(none.result.current).toEqual({ stage: null, level: null, changing: false })
  })

  it('la vue se ferme : plus d’étage ; rouverte, la position est relue', async () => {
    const view = await open()
    view.rerender({ enabled: false })
    expect(view.result.current.stage).toBeNull()
    vi.mocked(api.fetchCameraZoom).mockResolvedValue({ pos: 28, ...RANGE })
    view.rerender({ enabled: true })
    await tick()
    expect(api.fetchCameraZoom).toHaveBeenCalledTimes(2)
    expect(view.result.current.level).toBe(5)
  })

  it('le geste change le niveau tout de suite et l’envoie après un silence, une seule fois', async () => {
    const { result } = await open()
    let taken = false
    act(() => {
      taken = result.current.stage!.zoomBy(2)
    })
    expect(taken).toBe(true)
    expect(result.current.level).toBe(2)
    expect(result.current.changing).toBe(true)
    await tick(SEND_DELAY_MS - 1)
    act(() => void result.current.stage!.zoomBy(1.5))
    await tick(SEND_DELAY_MS - 1)
    expect(api.setCameraZoom).not.toHaveBeenCalled()
    await tick(1)
    expect(api.setCameraZoom).toHaveBeenCalledTimes(1)
    expect(api.setCameraZoom).toHaveBeenCalledWith('k', 'pommier', 14)
    // Le niveau s'efface un moment après le dernier changement.
    await tick(LEVEL_SHOWN_MS)
    expect(result.current.changing).toBe(false)
    expect(result.current.level).toBe(3)
  })

  it('en butée le geste n’est pas pris : en haut en zoomant, en bas en dézoomant', async () => {
    const { result } = await open()
    const stage = () => result.current.stage!
    expect(stage().zoomBy(0.5)).toBe(false)
    act(() => void stage().zoomBy(100))
    expect(result.current.level).toBe(5)
    expect(stage().zoomBy(1.2)).toBe(false)
    let down = false
    act(() => {
      down = stage().zoomBy(0.5)
    })
    expect(down).toBe(true)
    // Le niveau montré est celui du cran envoyé à la caméra (×2,5 tombe entre deux crans : le 11).
    expect(result.current.level).toBe(levelOf(11, RANGE))
  })

  it('un petit mouvement qui ne change pas de cran s’additionne sans rien envoyer', async () => {
    const { result } = await open()
    act(() => void result.current.stage!.zoomBy(1.01))
    expect(result.current.changing).toBe(true)
    await tick(SEND_DELAY_MS)
    expect(api.setCameraZoom).not.toHaveBeenCalled()
    for (let i = 0; i < 10; i++) act(() => void result.current.stage!.zoomBy(1.01))
    await tick(SEND_DELAY_MS)
    expect(api.setCameraZoom).toHaveBeenCalledTimes(1)
    expect(api.setCameraZoom).toHaveBeenCalledWith('k', 'pommier', 1)
  })

  it('commit envoie tout de suite ; sans rien en attente il ne fait rien', async () => {
    const { result } = await open()
    act(() => result.current.stage!.commit())
    expect(api.setCameraZoom).not.toHaveBeenCalled()
    act(() => void result.current.stage!.zoomBy(3))
    act(() => result.current.stage!.commit())
    expect(api.setCameraZoom).toHaveBeenCalledWith('k', 'pommier', 14)
    await tick(SEND_DELAY_MS)
    expect(api.setCameraZoom).toHaveBeenCalledTimes(1)
  })

  it('une requête à la fois : pendant un envoi la dernière valeur attend, les intermédiaires sont oubliées ; un échec est ignoré', async () => {
    let finish: () => void = () => undefined
    vi.mocked(api.setCameraZoom)
      .mockReturnValueOnce(new Promise((_resolve, reject) => (finish = () => reject(new Error('502')))))
      .mockResolvedValue({ pos: 0, ...RANGE })
    const { result } = await open()
    const zoomTo = (factor: number) => {
      act(() => void result.current.stage!.zoomBy(factor))
      act(() => result.current.stage!.commit())
    }
    zoomTo(2)
    expect(api.setCameraZoom).toHaveBeenCalledTimes(1)
    zoomTo(1.5)
    zoomTo(1.5)
    expect(api.setCameraZoom).toHaveBeenCalledTimes(1)
    await act(async () => {
      finish()
      await flush()
    })
    expect(api.setCameraZoom).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api.setCameraZoom).mock.calls.map((call) => call[2])).toEqual([7, 25])
  })

  it('démonter envoie la position en attente et coupe l’affichage', async () => {
    const { result, unmount } = await open()
    act(() => void result.current.stage!.zoomBy(5))
    unmount()
    expect(api.setCameraZoom).toHaveBeenCalledWith('k', 'pommier', 28)
    await tick(LEVEL_SHOWN_MS + SEND_DELAY_MS)
    expect(api.setCameraZoom).toHaveBeenCalledTimes(1)
  })

  it('ignore la réponse arrivée après le démontage', async () => {
    let ok: (zoom: { pos: number; min: number; max: number }) => void = () => undefined
    let ko: (error: Error) => void = () => undefined
    vi.mocked(api.fetchCameraZoom).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    const first = renderHook(() => useOpticalZoom('k', 'pommier', true))
    first.unmount()
    vi.mocked(api.fetchCameraZoom).mockReturnValueOnce(new Promise((_resolve, reject) => (ko = reject)))
    const second = renderHook(() => useOpticalZoom('k', 'pommier', true))
    second.unmount()
    await act(async () => {
      ok({ pos: 5, ...RANGE })
      ko(new Error('x'))
      await flush()
    })
    expect(first.result.current.level).toBeNull()
    expect(second.result.current.stage).toBeNull()
  })
})
