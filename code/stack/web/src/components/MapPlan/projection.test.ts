import { MAP_ANCHOR, MAP_CENTER } from './constants'
import { lngLatToPlan, planToLngLat } from './projection'

describe('projection', () => {
  it('le point d’ancrage du plan est le centre de la carte', () => {
    const [lng, lat] = planToLngLat(MAP_ANCHOR.x, MAP_ANCHOR.y)
    expect(lng).toBeCloseTo(MAP_CENTER[1], 9)
    expect(lat).toBeCloseTo(MAP_CENTER[0], 9)
  })
  it('lngLatToPlan est l’inverse de planToLngLat', () => {
    for (const [x, y] of [
      [0, 0],
      [540, 300],
      [-200, 700],
    ]) {
      const [px, py] = lngLatToPlan(...planToLngLat(x, y))
      expect(px).toBeCloseTo(x, 4)
      expect(py).toBeCloseTo(y, 4)
    }
  })
})
