import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { MAP_HOUSE_HEIGHT } from './constants'
import { fromHousePlan } from './helpers'

describe('fromHousePlan', () => {
  it('pousse la maison de HOUSE_SHIFT et allonge sa hauteur (300) jusqu’à celle de la carte', () => {
    expect(fromHousePlan(0, 0)).toEqual({ x: HOUSE_SHIFT, y: 0 })
    expect(fromHousePlan(100, 300)).toEqual({ x: 100 + HOUSE_SHIFT, y: MAP_HOUSE_HEIGHT })
  })
})
