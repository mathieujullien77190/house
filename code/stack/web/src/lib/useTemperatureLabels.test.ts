import { renderHook } from '@testing-library/react'
import type { PlanAc } from '@house/ui'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { labelItemId, useTemperatureLabels } from './useTemperatureLabels'

const h = vi.hoisted(() => ({ weather: null as { temperature: number } | null }))
vi.mock('@/lib/useWeather', () => ({ useWeather: () => h.weather }))

const ac = (over: Partial<PlanAc> = {}): PlanAc => ({ id: 'salon', name: 'Salon', x: 5, y: 6, temperature: 21, ...over }) as PlanAc
const byId = (labels: ReturnType<typeof useTemperatureLabels>) => Object.fromEntries(labels.map((label) => [label.id, label]))

describe('useTemperatureLabels', () => {
  beforeEach(() => {
    h.weather = null
  })

  it('sans rien de connu : les étiquettes sont à leur place de départ, sans texte', () => {
    const { result } = renderHook(() => useTemperatureLabels({}, [ac({ temperature: null })]))
    const labels = byId(result.current)
    expect(result.current.map((label) => label.id)).toEqual(['dehors', 'piece-salon'])
    expect(labels.dehors).toMatchObject({ name: 'Dehors', text: '', ...fromHousePlan(270, 335) })
    expect(labels['piece-salon']).toMatchObject({ name: 'Salon', x: 5, y: 24, text: '' })
  })

  it('écrit la météo et la clim ; une place du plan l’emporte', () => {
    h.weather = { temperature: 12.4 }
    const items = { [labelItemId('dehors')]: { x: 1, y: 2 }, [labelItemId('piece-salon')]: { x: 3, y: 4 } }
    const { result } = renderHook(() => useTemperatureLabels(items, [ac()]))
    const labels = byId(result.current)
    expect(labels.dehors).toMatchObject({ x: 1, y: 2, text: '12°' })
    expect(labels['piece-salon']).toMatchObject({ x: 3, y: 4, text: '21°' })
  })
})
