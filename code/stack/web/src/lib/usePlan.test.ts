import { act, renderHook } from '@testing-library/react'
import { DEFAULT_TREES, PLAN_CAMERAS } from '@/components/Lights/constants'
import { flush } from '@/test/fetch'
import type { PlanDocument } from './api'
import { toStored } from './planCoords'
import { usePlan } from './usePlan'

vi.mock('./api', () => ({ fetchPlan: vi.fn(), putPlan: vi.fn() }))
const api = await import('./api')

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(api.putPlan).mockResolvedValue(undefined)
})
afterEach(() => vi.useRealTimers())

const settle = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

const startPlan = (over: Partial<PlanDocument> = {}): PlanDocument => ({
  trees: [],
  hedges: [],
  cage: null,
  offsets: {},
  items: {},
  cameras: [],
  links: {},
  ...over,
})

describe('usePlan', () => {
  it('sans plan gardé, le dessin de départ est enregistré une fois', async () => {
    vi.mocked(api.fetchPlan).mockResolvedValue(null)
    const { result } = renderHook(() => usePlan('k'))
    await settle()
    expect(api.putPlan).toHaveBeenCalledTimes(1)
    expect(result.current.trees).toEqual(DEFAULT_TREES)
    expect(result.current.cameras.length).toBe(PLAN_CAMERAS.length)
    expect(Object.keys(result.current.links).length).toBeGreaterThan(0)
  })

  it('le dessin de départ n’est pas renvoyé si déjà chargé (lecture relancée)', async () => {
    vi.mocked(api.fetchPlan).mockResolvedValue(null)
    const { rerender } = renderHook(({ key }) => usePlan(key), { initialProps: { key: 'a' } })
    await settle()
    rerender({ key: 'b' })
    await settle()
    expect(api.putPlan).toHaveBeenCalledTimes(1)
  })

  it('l’échec de l’envoi est ignoré', async () => {
    vi.mocked(api.fetchPlan).mockResolvedValue(null)
    vi.mocked(api.putPlan).mockRejectedValue(new Error('x'))
    renderHook(() => usePlan('k'))
    await settle()
  })

  it('un échec de lecture garde le dessin de départ', async () => {
    vi.mocked(api.fetchPlan).mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => usePlan('k'))
    await settle()
    expect(result.current.trees).toEqual(DEFAULT_TREES)
    expect(api.putPlan).not.toHaveBeenCalled()
  })

  it('ignore une lecture arrivée après le démontage', async () => {
    let ok: (p: null) => void = () => undefined
    vi.mocked(api.fetchPlan).mockReturnValue(new Promise((resolve) => (ok = resolve)))
    const { unmount } = renderHook(() => usePlan('k'))
    unmount()
    await act(async () => {
      ok(null)
      await flush()
    })
    expect(api.putPlan).not.toHaveBeenCalled()
  })

  it('complète un plan gardé en version 2 par le dessin de départ, sans le renvoyer', async () => {
    const stored = toStored(
      startPlan({
        trees: [{ ...DEFAULT_TREES[0], x: 111 }],
        hedges: [
          {
            id: 'h',
            points: [
              [1, 1],
              [2, 2],
            ],
          },
        ],
        cage: { x: 300, y: 50 },
        cameras: [{ ...PLAN_CAMERAS[0], x: 77 }],
        links: { [PLAN_CAMERAS[0].id]: 'autre' },
      }),
    )
    vi.mocked(api.fetchPlan).mockResolvedValue(stored)
    const { result } = renderHook(() => usePlan('k'))
    await settle()
    expect(result.current.trees.length).toBe(DEFAULT_TREES.length)
    expect(result.current.trees.find((t) => t.id === DEFAULT_TREES[0].id)?.x).toBeCloseTo(111, 1)
    expect(result.current.hedges).toHaveLength(1)
    expect(result.current.cage).toMatchObject({ x: expect.closeTo(300, 1) })
    expect(result.current.cameras[0].x).toBeCloseTo(77, 1)
    expect(result.current.links[PLAN_CAMERAS[0].id]).toBe('autre')
    expect(api.putPlan).not.toHaveBeenCalled()
  })

  it('un plan vide (arbres et haies) prend le départ ; une version ancienne est renvoyée en version 2', async () => {
    vi.mocked(api.fetchPlan).mockResolvedValue(startPlan({ version: 1 }))
    const { result } = renderHook(() => usePlan('k'))
    await settle()
    expect(result.current.trees).toEqual(DEFAULT_TREES)
    expect(result.current.hedges.length).toBeGreaterThan(0)
    expect(api.putPlan).toHaveBeenCalledTimes(1)
  })

  it('un changement fait pendant la lecture n’est pas écrasé', async () => {
    let ok: (p: PlanDocument | null) => void = () => undefined
    vi.mocked(api.fetchPlan).mockReturnValue(new Promise((resolve) => (ok = resolve)))
    const { result } = renderHook(() => usePlan('k'))
    act(() => result.current.moveItem('lamp', 5, 6))
    await act(async () => {
      ok(startPlan({ version: 1 }))
      await flush()
    })
    expect(result.current.items.lamp).toEqual({ x: 5, y: 6 })
    // le plan est lu : l'envoi différé part
    await settle(500)
    expect(api.putPlan).toHaveBeenCalledTimes(1)
  })

  it('les changements s’appliquent tout de suite et partent 500 ms après le dernier', async () => {
    vi.mocked(api.fetchPlan).mockResolvedValue(null)
    const { result } = renderHook(() => usePlan('k'))
    await settle()
    vi.mocked(api.putPlan).mockClear()
    const camera = result.current.cameras[0]
    act(() => {
      result.current.moveItem('lamp', 7, 8)
      result.current.moveCamera(camera.id, 10, 11)
      result.current.adjustCamera(camera.id, { angle: 1, far: 2, fov: 3 })
    })
    expect(result.current.items.lamp).toEqual({ x: 7, y: 8 })
    expect(result.current.cameras[0]).toMatchObject({ x: 10, y: 11, angle: 1, far: 2, fov: 3 })
    expect(api.putPlan).not.toHaveBeenCalled()
    await settle(499)
    expect(api.putPlan).not.toHaveBeenCalled()
    await settle(1)
    expect(api.putPlan).toHaveBeenCalledTimes(1)
  })

  it('les autres caméras restent intactes quand on en déplace une', async () => {
    vi.mocked(api.fetchPlan).mockResolvedValue(null)
    const { result } = renderHook(() => usePlan('k'))
    await settle()
    const [c0, c1] = result.current.cameras
    act(() => {
      result.current.moveCamera(c0.id, 1, 1)
      result.current.adjustCamera(c0.id, { angle: 1, far: 1, fov: 1 })
    })
    expect(result.current.cameras[1]).toEqual(c1)
  })

  it('un changement avant la lecture du plan n’envoie rien', async () => {
    vi.mocked(api.fetchPlan).mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => usePlan('k'))
    act(() => result.current.moveItem('lamp', 1, 1))
    await settle(1000)
    expect(api.putPlan).not.toHaveBeenCalled()
  })

  it('link retire l’ancien lien d’une vraie caméra', async () => {
    vi.mocked(api.fetchPlan).mockResolvedValue(null)
    const { result } = renderHook(() => usePlan('k'))
    await settle()
    act(() => result.current.link('nouveau', 'voliere-interieur'))
    expect(result.current.links.nouveau).toBe('voliere-interieur')
    expect(Object.values(result.current.links).filter((n) => n === 'voliere-interieur')).toHaveLength(1)
    act(() => result.current.link('vide', ''))
    act(() => result.current.link('vide2', ''))
    expect(result.current.links.vide).toBe('')
  })

  it('démonte avec un envoi en attente : annulé', async () => {
    vi.mocked(api.fetchPlan).mockResolvedValue(null)
    const { result, unmount } = renderHook(() => usePlan('k'))
    await settle()
    vi.mocked(api.putPlan).mockClear()
    act(() => result.current.moveItem('lamp', 1, 1))
    unmount()
    await settle(1000)
    expect(api.putPlan).not.toHaveBeenCalled()
  })
})
