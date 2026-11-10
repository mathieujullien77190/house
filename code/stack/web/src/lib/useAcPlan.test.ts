import { act, renderHook } from '@testing-library/react'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { flush } from '@/test/fetch'
import type { AcUnit } from '@/types'
import { acItemId, useAcPlan } from './useAcPlan'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchAc: vi.fn(),
}))
const api = await import('./api')

const unit = (id: string, over: Partial<AcUnit> = {}): AcUnit => ({
  id,
  name: `AC ${id}`,
  reachable: true,
  power: true,
  mode: 'heat',
  targetTemp: 21,
  roomTemp: 19,
  fan: 'auto',
  vane: 'auto',
  wideVane: null,
  ...over,
})

beforeEach(() => {
  vi.useFakeTimers()
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

describe('useAcPlan', () => {
  it('la clé du plan', () => {
    expect(acItemId('salon')).toBe('ac-salon')
  })

  it('désactivé : rien, aucun appel', async () => {
    const { result } = renderHook(() => useAcPlan('k', {}, false))
    await tick(10_000)
    expect(result.current).toEqual([])
    expect(api.fetchAc).not.toHaveBeenCalled()
  })

  it('place les unités : plan gardé, place de départ, ou à côté dans le salon ; oriente et décrit', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([
      unit('salon'),
      unit('chambre-matou', { power: false, reachable: false }),
      unit('chambre-invite'),
      unit('x1'),
      unit('x2'),
    ])
    const { result } = renderHook(() => useAcPlan('k', { 'ac-chambre-invite': { x: 5, y: 6 } }, true))
    expect(result.current).toEqual([])
    await tick()
    const byId = Object.fromEntries(result.current.map((ac) => [ac.id, ac]))
    expect(byId.salon).toMatchObject({ ...fromHousePlan(345, 150), rotation: 90, on: true, reachable: true, temperature: 19 })
    expect(byId.salon.label).toMatch(/^AC salon · Allumée · Chaud · pièce 19\s°C · consigne 21\s°C$/)
    expect(byId['chambre-invite']).toMatchObject({ x: 5, y: 6, rotation: 0 })
    expect(byId['chambre-matou']).toMatchObject({ ...fromHousePlan(67, 10), rotation: -90, temperature: null, label: 'AC chambre-matou · ne répond pas' })
    expect(byId.x1).toMatchObject(fromHousePlan(300, 260))
    expect(byId.x2).toMatchObject(fromHousePlan(340, 260))
  })

  it('une unité éteinte n’affiche pas la consigne', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit('salon', { power: false })])
    const { result } = renderHook(() => useAcPlan('k', {}, true))
    await tick()
    expect(result.current[0].label).toMatch(/^AC salon · Éteinte · Chaud · pièce 19\s°C$/)
  })

  it('relit toutes les 10 s ; une erreur garde les dernières ; arrêt au démontage et réponse tardive ignorée', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit('salon')])
    const { result, unmount } = renderHook(() => useAcPlan('k', {}, true))
    await tick()
    vi.mocked(api.fetchAc).mockRejectedValue(new Error('x'))
    await tick(10_000)
    expect(result.current).toHaveLength(1)
    unmount()
    vi.mocked(api.fetchAc).mockClear()
    await tick(20_000)
    expect(api.fetchAc).not.toHaveBeenCalled()
  })

  it('ignore une réponse arrivée après le démontage', async () => {
    let ok: (units: AcUnit[]) => void = () => undefined
    vi.mocked(api.fetchAc).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    const { result, unmount } = renderHook(() => useAcPlan('k', {}, true))
    unmount()
    await act(async () => {
      ok([unit('salon')])
      await flush()
    })
    expect(result.current).toEqual([])
  })
})
