import { nearestOnRing, parcelPoints, ringPieces, type Point } from './ring'

const square: Point[] = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
]

describe('parcelPoints', () => {
  it('place le contour en unités du plan et retire le point de fermeture répété', () => {
    const center: [number, number] = [48, 2]
    const ring: [number, number][] = [
      [2, 48],
      [2.001, 48],
      [2, 48],
    ]
    const points = parcelPoints(ring, center, { x: 10, y: 20 }, 0, 1)
    expect(points).toHaveLength(2)
    expect(points[0][0]).toBeCloseTo(10)
    expect(points[0][1]).toBeCloseTo(20)
    expect(points[1][0]).toBeGreaterThan(10)
  })
  it('garde un contour non fermé et un contour vide', () => {
    const open: [number, number][] = [
      [2, 48],
      [2.001, 48],
      [2.001, 48.001],
    ]
    expect(parcelPoints(open, [48, 2], { x: 0, y: 0 }, 37, 1)).toHaveLength(3)
    // premier point égal en x mais pas en y
    expect(
      parcelPoints(
        [
          [2, 48],
          [2, 48.001],
        ],
        [48, 2],
        { x: 0, y: 0 },
        0,
        1,
      ),
    ).toHaveLength(2)
    expect(parcelPoints([], [48, 2], { x: 0, y: 0 }, 0, 1)).toEqual([])
  })
})

describe('nearestOnRing', () => {
  it('trouve le côté le plus proche et sa direction', () => {
    const result = nearestOnRing(square, [50, -10])
    expect(result.point).toEqual([50, 0])
    expect(result.along).toBe(50)
    expect(result.direction).toEqual([1, 0])
    const east = nearestOnRing(square, [200, 50])
    expect(east.point).toEqual([100, 50])
    expect(east.direction).toEqual([0, 1])
  })
  it('un côté de longueur nulle ne casse rien', () => {
    const result = nearestOnRing(
      [
        [0, 0],
        [0, 0],
        [10, 0],
      ],
      [5, 5],
    )
    expect(result.point[0]).toBeCloseTo(5)
  })
  it('un contour vide donne l’origine', () => {
    expect(nearestOnRing([], [1, 1]).point).toEqual([0, 0])
  })
})

describe('ringPieces', () => {
  it('sans ouverture : tout le contour en un morceau fermé', () => {
    const pieces = ringPieces(square, [])
    expect(pieces).toHaveLength(1)
    expect(pieces[0][0]).toEqual([0, 0])
    expect(pieces[0][pieces[0].length - 1]).toEqual([0, 0])
  })
  it('une ouverture au milieu d’un côté laisse un seul morceau (le contour se recolle)', () => {
    const pieces = ringPieces(square, [{ along: 50, half: 10 }])
    expect(pieces).toHaveLength(1)
    const flat = pieces[0]
    expect(flat.some(([x, y]) => y === 0 && x > 40 && x < 60)).toBe(false)
  })
  it('deux ouvertures donnent deux morceaux', () => {
    const pieces = ringPieces(square, [
      { along: 50, half: 10 },
      { along: 250, half: 10 },
    ])
    expect(pieces).toHaveLength(2)
  })
  it('une ouverture qui enjambe le départ du contour (position proche de 0)', () => {
    const pieces = ringPieces(square, [{ along: 3, half: 10 }])
    expect(pieces).toHaveLength(1)
  })
  it('une ouverture couvrant tout un côté', () => {
    const pieces = ringPieces(square, [{ along: 50, half: 60 }])
    expect(pieces.length).toBeGreaterThanOrEqual(1)
  })
  it('un contour dégénéré (points confondus)', () => {
    expect(() =>
      ringPieces(
        [
          [0, 0],
          [0, 0],
        ],
        [],
      ),
    ).not.toThrow()
    expect(ringPieces([], [])).toEqual([])
  })
  it('une ouverture au bout d’un côté coupe aussi le morceau voisin', () => {
    const pieces = ringPieces(square, [{ along: 100, half: 10 }])
    expect(pieces).toHaveLength(1)
  })
  it('un tracé qui ne se referme pas sur lui-même garde deux morceaux séparés', () => {
    // deux ouvertures près du départ : le dernier morceau ne rejoint pas le premier
    const pieces = ringPieces(square, [
      { along: 0, half: 5 },
      { along: 200, half: 5 },
    ])
    expect(pieces).toHaveLength(2)
  })
})

describe('ringPieces : cas limites', () => {
  it('ouvertures aux bords identiques : les coupures en double sont ignorées', () => {
    const pieces = ringPieces(square, [
      { along: 50, half: 10 },
      { along: 50, half: 10 },
    ])
    expect(pieces).toHaveLength(1)
  })
  it('un côté de longueur nulle avec une ouverture', () => {
    expect(() =>
      ringPieces(
        [
          [0, 0],
          [0, 0],
          [10, 0],
        ],
        [{ along: 0, half: 1 }],
      ),
    ).not.toThrow()
  })
})
