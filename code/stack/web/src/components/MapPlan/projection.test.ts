import { MAP_ANCHOR, MAP_CENTER } from './constants'
import { lngLatToPlan, planToLngLat, lampBounds } from './projection'

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

describe('lampBounds', () => {
  it('rien sans lampe', () => {
    expect(lampBounds([])).toBeNull()
  })

  it('le rectangle qui contient toutes les lampes', () => {
    const [[west, south], [east, north]] = lampBounds([
      { x: 0, y: 0 },
      { x: 200, y: 100 },
      { x: 50, y: 300 },
    ])!
    for (const [x, y] of [
      [0, 0],
      [200, 100],
      [50, 300],
    ]) {
      const [lng, lat] = planToLngLat(x, y)
      expect(lng).toBeGreaterThanOrEqual(west)
      expect(lng).toBeLessThanOrEqual(east)
      expect(lat).toBeGreaterThanOrEqual(south)
      expect(lat).toBeLessThanOrEqual(north)
    }
  })
})
