import { act, renderHook } from '@testing-library/react'
import type { PlanAc } from '@house/ui'
import type { HueSensor } from '@/types'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { flush } from '@/test/fetch'
import * as api from '@/lib/api'
import { labelItemId, useTemperatureLabels } from './useTemperatureLabels'

const h = vi.hoisted(() => ({ weather: null as { temperature: number } | null }))
vi.mock('@/lib/api', () => ({ fetchSensors: vi.fn() }))
vi.mock('@/lib/useWeather', () => ({ useWeather: () => h.weather }))

const cage = { x: 10, y: 20, w: 100, h: 50 }
const sensor = (id: string, temperature: number | null, reachable = true): HueSensor => ({ id, temperature, reachable }) as HueSensor
const ac = (over: Partial<PlanAc> = {}): PlanAc => ({ id: 'salon', name: 'Salon', x: 5, y: 6, temperature: 21, ...over }) as PlanAc
const tick = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}
const byId = (labels: ReturnType<typeof useTemperatureLabels>) => Object.fromEntries(labels.map((label) => [label.id, label]))

describe('useTemperatureLabels', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    h.weather = null
    vi.mocked(api.fetchSensors).mockResolvedValue([])
  })
  afterEach(() => vi.useRealTimers())

  it('sans rien de connu : les étiquettes sont à leur place de départ, sans texte', async () => {
    const { result } = renderHook(() => useTemperatureLabels('k', {}, cage, [ac({ temperature: null })], true))
    await tick()
    const labels = byId(result.current)
    expect(result.current.map((label) => label.id)).toEqual(['dehors', 'cage-exterieur', 'piece-salon', 'cage-interieur'])
    expect(labels.dehors).toMatchObject({ name: 'Dehors', text: '', ...fromHousePlan(270, 335) })
    expect(labels['cage-exterieur']).toMatchObject({ x: 60, y: 34, text: '' })
    expect(labels['cage-interieur']).toMatchObject({ x: 60, y: 56, text: '' })
    expect(labels['piece-salon']).toMatchObject({ name: 'Salon', x: 5, y: 24, text: '' })
  })

  it('écrit la météo, les détecteurs joignables et la clim ; une place du plan l’emporte', async () => {
    h.weather = { temperature: 12.4 }
    vi.mocked(api.fetchSensors).mockResolvedValue([sensor('57', 9.5), sensor('54', 20, false), sensor('12', 1)])
    const items = { [labelItemId('dehors')]: { x: 1, y: 2 }, [labelItemId('piece-salon')]: { x: 3, y: 4 } }
    const { result } = renderHook(() => useTemperatureLabels('k', items, cage, [ac()], true))
    await tick()
    const labels = byId(result.current)
    expect(labels.dehors).toMatchObject({ x: 1, y: 2, text: '12°' })
    expect(labels['cage-exterieur'].text).toBe('9,5°')
    expect(labels['cage-interieur'].text).toBe('')
    expect(labels['piece-salon']).toMatchObject({ x: 3, y: 4, text: '21°' })
  })

  it('un détecteur sans mesure ne s’écrit pas ; relit toutes les 30 s ; un échec garde la liste', async () => {
    vi.mocked(api.fetchSensors)
      .mockResolvedValueOnce([sensor('57', null)])
      .mockResolvedValueOnce([sensor('57', 8)])
      .mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useTemperatureLabels('k', {}, cage, [], true))
    await tick()
    expect(byId(result.current)['cage-exterieur'].text).toBe('')
    await tick(30_000)
    expect(byId(result.current)['cage-exterieur'].text).toBe('8°')
    await tick(30_000)
    expect(byId(result.current)['cage-exterieur'].text).toBe('8°')
  })

  it('désactivé : aucune lecture ; une réponse après le démontage est ignorée', async () => {
    renderHook(() => useTemperatureLabels('k', {}, cage, [], false))
    await tick(30_000)
    expect(api.fetchSensors).not.toHaveBeenCalled()
    let resolve: (list: HueSensor[]) => void = () => undefined
    vi.mocked(api.fetchSensors).mockReturnValue(new Promise<HueSensor[]>((done) => (resolve = done)))
    const { result, unmount } = renderHook(() => useTemperatureLabels('k', {}, cage, [], true))
    unmount()
    await act(async () => resolve([sensor('57', 8)]))
    expect(byId(result.current)['cage-exterieur'].text).toBe('')
  })
})
