import { cameraRing, circleRing, fovRing, pathRings, polar, rectRing } from './shapes'

describe('shapes', () => {
  it('rectRing donne les quatre coins', () => {
    expect(rectRing(1, 2, 3, 4)).toEqual([
      [1, 2],
      [4, 2],
      [4, 6],
      [1, 6],
    ])
  })
  it('circleRing : tous les points sont sur le cercle', () => {
    const ring = circleRing(10, 20, 5)
    expect(ring).toHaveLength(32)
    expect(circleRing(0, 0, 1, 4)).toHaveLength(4)
    for (const [x, y] of ring) expect(Math.hypot(x - 10, y - 20)).toBeCloseTo(5)
  })
  it('polar : 0° vers le haut, 90° vers la droite', () => {
    const [x0, y0] = polar(0, 0, 0, 10)
    expect(x0).toBeCloseTo(0)
    expect(y0).toBeCloseTo(-10)
    const [x1, y1] = polar(0, 0, 90, 10)
    expect(x1).toBeCloseTo(10)
    expect(y1).toBeCloseTo(0)
  })
  it('fovRing : un croissant entre near et far', () => {
    const ring = fovRing(0, 0, 0, 60, 10, 100)
    expect(ring).toHaveLength(50)
    expect(Math.hypot(...ring[0])).toBeCloseTo(100)
    expect(Math.hypot(...ring[49])).toBeCloseTo(10)
    expect(fovRing(0, 0, 0, 60, 10, 100, 4)).toHaveLength(10)
  })
  it('cameraRing : huit points tournés vers l’angle', () => {
    const up = cameraRing(0, 0, 0)
    expect(up).toHaveLength(8)
    // l'objectif (devant) est vers le haut : y négatif
    expect(Math.min(...up.map(([, y]) => y))).toBeLessThan(-15)
    const right = cameraRing(0, 0, 90)
    expect(Math.max(...right.map(([x]) => x))).toBeGreaterThan(15)
  })

  describe('pathRings', () => {
    it('lit M, L, H, V, Z', () => {
      expect(pathRings('M 0 0 L 10 0 H 10 V 10 L 0 10 Z')).toEqual([
        [
          [0, 0],
          [10, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ],
      ])
    })
    it('un M sans Z clôt le contour précédent ; un contour d’un seul point est ignoré', () => {
      expect(pathRings('M 0 0 L 1 1 M 5 5 L 6 6')).toHaveLength(2)
      expect(pathRings('M 0 0 M 5 5 L 6 6')).toHaveLength(1)
      expect(pathRings('M 0 0 Z')).toEqual([])
      expect(pathRings('')).toEqual([])
    })
    it('un arc de cercle est découpé en 32 points, dans les deux sens', () => {
      const sweep = pathRings('M 10 0 A 10 0 0 0 1 -10 0')
      expect(sweep[0]).toHaveLength(33)
      const back = pathRings('M 10 0 A 10 0 0 0 0 -10 0')
      expect(back[0]).toHaveLength(33)
      // sens opposés : le milieu est de part et d'autre
      expect(sweep[0][16][1] * back[0][16][1]).toBeLessThan(0)
    })
    it('un arc de grand angle, rayon trop petit corrigé, et arc de longueur nulle', () => {
      expect(pathRings('M 0 0 A 1 0 0 1 1 10 0 L 10 10')[0].length).toBeGreaterThan(30)
      expect(pathRings('M 0 0 A 100 0 0 1 0 0 0 L 1 1')[0]).toHaveLength(2)
      expect(pathRings('M 0 0 A 10 0 0 1 1 10 0')[0].length).toBe(33)
      expect(pathRings('M 0 0 A 10 0 0 0 1 10 0')[0].length).toBe(33)
      expect(pathRings('M 0 0 A 10 0 0 1 0 10 0')[0].length).toBe(33)
    })
  })
})

describe('pathRings : commande inconnue', () => {
  it('un jeton qui n’est pas une commande est sauté', () => {
    expect(pathRings('M 0 0 5 L 1 1')).toEqual([
      [
        [0, 0],
        [1, 1],
      ],
    ])
  })
})
