import { renderHook } from '@testing-library/react'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import type { HueSensor } from '@/types'
import { planSensors, sensorItemId, useSensorPlan } from './useSensorPlan'

const h = vi.hoisted(() => ({ sensors: [] as unknown[], calls: [] as unknown[][] }))
vi.mock('@/lib/useSensors', () => ({
  useSensors: (...args: unknown[]) => {
    h.calls.push(args)
    return h.sensors
  },
}))

const cage = { x: 100, y: 200, w: 50, h: 100 }
const sensor = (id: string, over: Partial<HueSensor> = {}): HueSensor => ({
  id,
  name: `S${id}`,
  presence: false,
  presenceSince: null,
  temperature: 20.8,
  lux: null,
  dark: null,
  battery: null,
  reachable: true,
  ...over,
})

describe('planSensors', () => {
  it('la clé du plan', () => {
    expect(sensorItemId('60')).toBe('sensor-60')
  })

  it('la place gardée du plan l’emporte, avec la température exacte', () => {
    expect(planSensors([sensor('60')], { 'sensor-60': { x: 5, y: 6 } }, cage)).toEqual([
      { id: '60', name: 'S60', x: 5, y: 6, temperature: 20.8, reachable: true },
    ])
  })

  it('les détecteurs de la cage : à la place de leur ancienne étiquette, sinon dans la cage à gauche du milieu', () => {
    const result = planSensors([sensor('57'), sensor('54')], { 'label-cage-exterieur': { x: 7, y: 8 } }, cage)
    expect(result[0]).toMatchObject({ id: '57', x: 7, y: 8 })
    expect(result[1].x).toBeCloseTo(100 + 50 * 0.22)
    expect(result[1].y).toBeCloseTo(200 + 100 * 0.72)
  })

  it('« motion sdb » part dans la salle de bain ; un détecteur inconnu sans place n’est pas sur la carte', () => {
    const result = planSensors([sensor('60', { temperature: null, reachable: false }), sensor('99')], {}, cage)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: '60', ...fromHousePlan(172, 100), temperature: null, reachable: false })
  })
})

describe('useSensorPlan', () => {
  it('lit les détecteurs (clé, activation) et les pose', () => {
    h.sensors = [sensor('60')]
    const { result } = renderHook(() => useSensorPlan('k', {}, cage, true))
    expect(h.calls.at(-1)).toEqual(['k', true])
    expect(result.current.map((item) => item.id)).toEqual(['60'])
  })
})
