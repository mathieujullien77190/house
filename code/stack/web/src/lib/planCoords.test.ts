import type { PlanDocument } from './api'
import { fromStored, STORED_VERSION, toStored } from './planCoords'

const plan: PlanDocument = {
  trees: [{ id: 't', x: 300, y: 100, r: 40 }],
  hedges: [
    {
      id: 'h',
      points: [
        [10, 20],
        [30, 40],
      ],
    },
  ],
  cage: { x: 200, y: 150 },
  offsets: { g: { dx: 43.5, dy: -87 } },
  items: { lamp: { x: 100, y: 100 } },
  cameras: [{ id: 'c', name: 'cam', x: 250, y: 120, angle: 90, fov: 60, near: 10, far: 200 }],
  links: { c: 'voliere' },
}

describe('planCoords', () => {
  it('toStored passe en version 2 (coordonnées réelles)', () => {
    const stored = toStored(plan)
    expect(stored.version).toBe(STORED_VERSION)
    expect(stored.trees[0].x).toBeCloseTo(2.65, 1)
    expect(stored.trees[0].y).toBeCloseTo(48.52, 1)
    expect(stored.cameras[0].angle).toBeGreaterThanOrEqual(0)
    expect(stored.links).toEqual({ c: 'voliere' })
  })

  it('fromStored(toStored(plan)) retrouve le plan', () => {
    const back = fromStored(toStored(plan))
    expect(back.trees[0].x).toBeCloseTo(300, 2)
    expect(back.trees[0].r).toBeCloseTo(40, 1)
    expect(back.hedges[0].points[1][1]).toBeCloseTo(40, 2)
    expect(back.cage?.x).toBeCloseTo(200, 2)
    expect(back.offsets.g.dx).toBeCloseTo(43.5, 1)
    expect(back.items.lamp.y).toBeCloseTo(100, 2)
    expect(back.cameras[0].angle).toBeCloseTo(90, 1)
    expect(back.cameras[0].far).toBeCloseTo(200, 1)
  })

  it('cage absente (null) reste null dans les deux sens', () => {
    expect(toStored({ ...plan, cage: null }).cage).toBeNull()
    expect(fromStored({ ...toStored(plan), cage: null }).cage).toBeNull()
  })

  it('un plan d’une autre version est laissé tel quel', () => {
    const old = { ...plan, version: 1 }
    expect(fromStored(old)).toBe(old)
    expect(fromStored(plan)).toBe(plan)
  })
})
