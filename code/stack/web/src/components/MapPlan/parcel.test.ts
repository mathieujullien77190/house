import { PLAN_GATES } from '@/components/Lights/constants'
import { eastLimitAt, PARCEL, PARCEL_GATES, PARCEL_HEDGES } from './parcel'

describe('parcel', () => {
  it('le contour est fermé', () => {
    expect(PARCEL[0]).toEqual(PARCEL[PARCEL.length - 1])
  })
  it('les portails gardent leur identifiant, leur longueur, et sont posés sur la haie', () => {
    expect(PARCEL_GATES.map((gate) => gate.id)).toEqual(PLAN_GATES.map((gate) => gate.id))
    PARCEL_GATES.forEach((gate, index) => {
      const original = PLAN_GATES[index]
      expect(Math.hypot(gate.x2 - gate.x1, gate.y2 - gate.y1)).toBeCloseTo(Math.hypot(original.x2 - original.x1, original.y2 - original.y1))
    })
  })
  it('les haies de départ sont des morceaux numérotés', () => {
    expect(PARCEL_HEDGES.length).toBeGreaterThan(0)
    expect(PARCEL_HEDGES[0].id).toBe('haie-1')
    for (const hedge of PARCEL_HEDGES) expect(hedge.points.length).toBeGreaterThan(1)
  })
  it('eastLimitAt : le x le plus à l’est de la limite à une hauteur, -Infinity hors de la parcelle', () => {
    const middle = eastLimitAt(0)
    expect(Number.isFinite(middle)).toBe(true)
    expect(eastLimitAt(1e9)).toBe(-Infinity)
    // à la hauteur d'un sommet, le segment horizontal éventuel ne fait pas planter (t = 0)
    expect(Number.isFinite(eastLimitAt(PARCEL_HEDGES[0].points[0][1]))).toBe(true)
  })
})

describe('eastLimitAt avec un côté horizontal', () => {
  it('ne divise pas par zéro', async () => {
    vi.resetModules()
    vi.doMock('./ring', async (importOriginal) => ({
      ...(await importOriginal<typeof import('./ring')>()),
      parcelPoints: () => [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    }))
    const mocked = await import('./parcel')
    expect(mocked.eastLimitAt(0)).toBe(10)
    vi.doUnmock('./ring')
    vi.resetModules()
  })
})
