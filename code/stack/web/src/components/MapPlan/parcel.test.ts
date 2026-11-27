import { PARCEL, PARCEL_HEDGES } from './parcel'

describe('parcel', () => {
  it('le contour est fermé', () => {
    expect(PARCEL[0]).toEqual(PARCEL[PARCEL.length - 1])
  })
  it('les haies de départ sont des morceaux numérotés', () => {
    expect(PARCEL_HEDGES.length).toBeGreaterThan(0)
    expect(PARCEL_HEDGES[0].id).toBe('haie-1')
    for (const hedge of PARCEL_HEDGES) expect(hedge.points.length).toBeGreaterThan(1)
  })
})
