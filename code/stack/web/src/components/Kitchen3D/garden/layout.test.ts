import { PLAN_GATES, UNITS_PER_METER } from '@/components/Lights/constants'
import { BASE, OUTER_WALL, REST, ROOM } from '@/components/Kitchen3D/constants'
import { BINS_FROM_FACADE, CAGE, CAGE_NORTH, CAGE_WEST, PANEL, PATH_SHIFT, TERRACE } from './constants'
import { SITE } from './layout'
import { gardenX, gardenZ } from './plan'

describe('SITE', () => {
  it('l’emprise de la maison compte ses murs extérieurs', () => {
    expect(SITE.house).toEqual([ROOM.xMin - OUTER_WALL, ROOM.xMax + OUTER_WALL, REST.west - OUTER_WALL, ROOM.zMax + OUTER_WALL])
    expect(SITE.terraceWest).toBeCloseTo(SITE.house[2] - TERRACE)
  })

  it('la marche entre les deux niveaux suit le nu du soubassement, en retrait du mur nord', () => {
    expect(SITE.stepLine).toBeCloseTo(ROOM.xMax + OUTER_WALL - BASE.setback)
    expect(gardenX(SITE.stepY)).toBeCloseTo(SITE.stepLine)
    expect(SITE.stepZ).toBeCloseTo(gardenZ(CAGE_WEST - 4))
  })

  it('la cage : quatre panneaux sur cinq, au nord-est de la maison, et le coin de son plan en L', () => {
    expect(SITE.cageX2).toBeCloseTo(gardenX(CAGE_NORTH))
    expect(SITE.cageZ1).toBeCloseTo(gardenZ(CAGE_WEST))
    expect(SITE.cageDepth).toBeCloseTo(CAGE.depth)
    expect(SITE.cageZ2 - SITE.cageZ1).toBeCloseTo(CAGE.width)
    expect(SITE.middleX).toBeCloseTo((SITE.cageX1 + SITE.cageX2) / 2)
    // Le coin sud-ouest (deux panneaux sur un) est dehors.
    expect(SITE.backX - SITE.cageX1).toBeCloseTo(PANEL)
    expect(SITE.turnZ - SITE.cageZ1).toBeCloseTo(PANEL * 2)
    expect(SITE.cageFace).toBeCloseTo(SITE.backX)
    // Elle est au nord de la façade, à l'est du mur du bureau.
    expect(SITE.cageX1).toBeGreaterThan(SITE.house[1])
    expect(SITE.cageZ1).toBeGreaterThan(ROOM.zMax)
  })

  it('le portail est celui du plan ; le portillon suit son allée, décalée de 10 cm', () => {
    expect(SITE.gate).toBe(PLAN_GATES[0])
    expect(SITE.wicket.x1 - PLAN_GATES[1].x1).toBeCloseTo(0.1 * UNITS_PER_METER)
    expect(SITE.wicket.x2 - PLAN_GATES[1].x2).toBeCloseTo(-PATH_SHIFT)
    expect(SITE.wicket.y1).toBe(PLAN_GATES[1].y1)
  })

  it('les poubelles sont à 1,16 m de la façade des baies, entre le chemin du portillon et la haie de l’est', () => {
    // Leur rang est celui de leur milieu : une demi-poubelle (28 cm) plus loin.
    expect(SITE.house[0] - SITE.binX).toBeCloseTo(BINS_FROM_FACADE + 0.28)
    expect(SITE.binSouth).toBeCloseTo(SITE.binX - 0.4)
    expect(SITE.binWest).toBeLessThan(SITE.binEnd)
    expect(SITE.binEnd).toBeLessThan(SITE.binEast)
  })

  it('le laurier est devant le long bac, au milieu du grand côté grillagé ; la terrasse surélevée arrive presque au sol de la maison', () => {
    expect(SITE.treeX).toBeCloseTo((SITE.backX + SITE.cageX2) / 2)
    expect(SITE.treeZ).toBeCloseTo(SITE.cageZ1 - 1.05)
    expect(SITE.raised).toBeCloseTo(BASE.rise - 0.04)
  })
})
