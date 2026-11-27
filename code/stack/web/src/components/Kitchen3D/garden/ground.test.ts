import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { BASE, ENTRY, OUTER_WALL, PATIO_DOOR, ROOM, SAS } from '@/components/Kitchen3D/constants'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { GARAGE_DEPTH, GRASS, LOT, LOW, PATH_DROP, PATH_STEPS, PAVING, TERRACE } from './constants'
import { groundTerrace, lawns, paving, raisedTerrace, retainingWalls } from './ground'
import { SITE } from './layout'
import { PERGOLA_FRONT } from './pergola'
import { gardenX, gardenZ } from './plan'

const built = (build: (group: THREE.Group, m: ReturnType<typeof gardenMaterials>) => void) => {
  const group = new THREE.Group()
  const m = gardenMaterials()
  build(group, m)
  return { meshes: group.children as THREE.Mesh[], m }
}

const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters
const boundsOf = (mesh: THREE.Mesh) => new THREE.Box3().setFromObject(mesh)

beforeEach(() => {
  stubCanvasContext(null)
})

describe('lawns', () => {
  it('la pelouse sur deux niveaux, l’herbe surélevée de la partie basse, et le muret qui la tient', () => {
    const { meshes, m } = built(lawns)
    expect(meshes).toHaveLength(4)
    const [lawn, lowLawn, highGrass, curb] = meshes
    for (const surface of [lawn, lowLawn, highGrass]) {
      expect(surface.geometry.type).toBe('ShapeGeometry')
      expect(surface.material).toBe(m.grass)
      expect(surface.rotation.x).toBeCloseTo(-Math.PI / 2)
    }
    expect(lawn.position.y).toBe(-0.02)
    expect(lowLawn.position.y).toBeCloseTo(-LOW - 0.02)
    expect(highGrass.position.y).toBeCloseTo(GRASS)
    // La pelouse du haut va de la marche (la façade nord) jusqu'au bas de l'arc, côté rue.
    const high = boundsOf(lawn)
    expect(high.min.x).toBeCloseTo(gardenX(LOT.centerY + LOT.radius))
    expect(high.max.x).toBeCloseTo(SITE.cageX2)
    expect(high.max.z).toBeCloseTo(gardenZ(LOT.east))
    // La partie basse commence à la marche et va jusqu'à la limite nord.
    const low = boundsOf(lowLawn)
    expect(low.min.x).toBeCloseTo(SITE.stepLine)
    expect(low.max.x).toBeCloseTo(gardenX(LOT.north))
    // Le muret de béton : du niveau bas jusqu'à 4 cm au-dessus de l'herbe.
    expect(curb.material).toBe(m.wall)
    expect(sizeOf(curb).height).toBeCloseTo(GRASS + 0.04 + LOW)
    expect(curb.position.y - sizeOf(curb).height / 2).toBeCloseTo(-LOW)
    expect(curb.position.x).toBeCloseTo(SITE.stepLine + TERRACE + BASE.setback + 0.06)
  })
})

describe('retainingWalls', () => {
  it('la marche de 20 cm entre les deux niveaux : six murets du même béton, et le soubassement qui descend sous la façade nord', () => {
    const { meshes, m } = built(retainingWalls)
    expect(meshes).toHaveLength(7)
    for (const wall of meshes) {
      expect(sizeOf(wall).height).toBe(LOW)
      expect(wall.position.y).toBeCloseTo(-LOW / 2)
    }
    expect(meshes.slice(0, 6).every((wall) => wall.material === m.riser)).toBe(true)
    // Le long du fond de la cage, jusqu'à la limite est.
    expect(meshes[0].position.x).toBeCloseTo(SITE.cageX2 + 0.06)
    expect(sizeOf(meshes[0]).depth).toBeCloseTo(gardenZ(LOT.east) - SITE.stepZ)
    // Le soubassement : de l'épaisseur du mur moins son retrait, sur toute la façade.
    const base = meshes[6]
    expect(base.material).not.toBe(m.riser)
    expect(sizeOf(base).width).toBeCloseTo(OUTER_WALL - BASE.setback)
    expect(sizeOf(base).depth).toBeCloseTo(SITE.house[3] - BASE.setback - SITE.house[2])
  })
})

describe('groundTerrace', () => {
  it('trois bandes carrelées d’1,50 m (sud, ouest, est), la bande de béton de derrière et le perron', () => {
    const { meshes, m } = built(groundTerrace)
    expect(meshes).toHaveLength(5)
    const [south, west, east, band, porch] = meshes
    for (const tiled of [south, west, east]) {
      expect(tiled.material).toBe(m.terrace)
      expect(tiled.position.y).toBe(-0.004)
    }
    const { house } = SITE
    const southBox = boundsOf(south)
    expect(southBox.min.x).toBeCloseTo(house[0] - TERRACE)
    expect(southBox.min.z).toBeCloseTo(house[2] - TERRACE)
    expect(southBox.max.z).toBeCloseTo(house[3] + TERRACE)
    expect(boundsOf(west).max.x).toBeCloseTo(house[1])
    expect(boundsOf(east).max.x).toBeCloseTo(SITE.stepLine)
    // Derrière la maison, du béton, dans la partie basse.
    expect(band.material).toBe(m.concrete)
    expect(band.position.y).toBeCloseTo(-LOW - 0.001)
    expect(sizeOf(band).width).toBeCloseTo(TERRACE + BASE.setback)
    // Le perron, devant la porte d'entrée, de la largeur du sas.
    expect(porch.material).toBe(m.terrace)
    expect(sizeOf(porch).width).toBeCloseTo(SAS.north - SAS.south)
    expect(sizeOf(porch).depth).toBeCloseTo(house[3] - ENTRY.doorZ - OUTER_WALL)
  })
})

describe('paving', () => {
  it('le pavage de l’est, le sol de la cage et le chemin du portillon en terre cuite, puis l’allée de béton du portail', () => {
    const { meshes, m } = built(paving)
    // Le pavage, le sol de la cage (carreaux, terre), le chemin du portillon (plat, trois marches avec leur contremarche, plat en contrebas), l'allée du garage (rampe et trois murs).
    expect(meshes).toHaveLength(15)
    const [east, tiles, soil, pathTop, ...rest] = meshes
    expect(meshes.slice(0, 4).map((mesh) => mesh.material)).toEqual([m.terrace, m.terrace, m.soil, m.terrace])
    expect(east.position.y).toBe(-0.008)
    expect([tiles.position.y, soil.position.y]).toEqual([-0.008, -0.008])
    // Le sol de la cage : des carreaux, sauf une bande de terre le long du grillage de devant ; à eux deux, ils couvrent toute la cage.
    const floor = boundsOf(tiles)
    const earth = boundsOf(soil)
    expect(floor.min.x).toBeCloseTo(SITE.cageX1)
    expect(floor.max.x).toBeCloseTo(SITE.cageX2)
    expect(floor.max.z).toBeCloseTo(SITE.cageZ2)
    expect(earth.min.z).toBeCloseTo(SITE.cageZ1)
    expect(earth.min.x).toBeCloseTo(gardenX(SITE.recessPlan))
    expect(earth.max.x).toBeCloseTo(SITE.cageX2)
    // La terre touche les carreaux : la bande est devant (du côté du bac), les carreaux derrière.
    expect(earth.max.z).toBeCloseTo(floor.min.z)
    expect(earth.max.z - earth.min.z).toBeGreaterThan(0.5)
    expect(floor.min.z).toBeGreaterThan(SITE.cageZ1)
    // Le chemin du portillon part du sud du pavage, de plain-pied, puis descend de trois marches de 17 cm.
    const top = boundsOf(pathTop)
    expect(top.max.x).toBeCloseTo(gardenX(PAVING.south))
    expect(top.min.x).toBeCloseTo(gardenX(PATH_STEPS.from))
    expect(top.min.z).toBeCloseTo(gardenZ(PAVING.pathWest))
    expect(top.max.z).toBeCloseTo(gardenZ(PAVING.pathEast))
    const steps = rest.slice(0, 6)
    // Chaque marche : une surface, un cran plus bas que la précédente, puis sa contremarche.
    for (let step = 0; step < PATH_STEPS.count; step += 1) {
      const [tread, riser] = [steps[step * 2], steps[step * 2 + 1]]
      expect(tread.position.y).toBeCloseTo(-0.008 - PATH_STEPS.drop * (step + 1))
      expect(sizeOf(riser).height).toBeCloseTo(PATH_STEPS.drop)
      expect(sizeOf(riser).width).toBe(0.02)
      expect(riser.position.y).toBeCloseTo(-0.008 - PATH_STEPS.drop * step - PATH_STEPS.drop / 2)
      expect(sizeOf(riser).depth).toBeCloseTo(gardenZ(PAVING.pathEast) - gardenZ(PAVING.pathWest))
    }
    // En contrebas, après la dernière marche, jusqu'au portillon.
    const lowPath = rest[6]
    expect(lowPath.position.y).toBeCloseTo(-0.008 - PATH_DROP)
    expect(boundsOf(lowPath).min.x).toBeCloseTo(gardenX(PAVING.pathEnd))
    expect(boundsOf(lowPath).max.x).toBeCloseTo(gardenX(PATH_STEPS.from + PATH_STEPS.count * PATH_STEPS.tread))
    // L'allée du garage : une rampe de béton, du niveau du chemin (au portail) à 2 m sous le terrain (au pied de la terrasse), entre trois murs.
    const [ramp, ...walls] = rest.slice(7)
    expect(ramp.material).toBe(m.concrete)
    expect(walls).toHaveLength(3)
    expect(walls.every((wall) => wall.material === m.wall)).toBe(true)
    const heights = Array.from(ramp.geometry.attributes.position.array).filter((_, index) => index % 3 === 1)
    expect(Math.max(...heights)).toBeCloseTo(-0.012 - PATH_DROP)
    expect(Math.min(...heights)).toBeCloseTo(-GARAGE_DEPTH)
    // Elle est à l'ouest de la maison.
    expect(boundsOf(ramp).max.z).toBeLessThan(SITE.house[2])
    // Les murs vont de la rampe au terrain (y = 0).
    for (const wall of walls) expect(boundsOf(wall).max.y).toBeCloseTo(0)
  })
})

describe('raisedTerrace', () => {
  it('le massif carrelé presque au niveau de la maison, ses deux marches, et les murets de la jardinière ouverte devant la porte-fenêtre', () => {
    const { meshes, m } = built(raisedTerrace)
    expect(meshes).toHaveLength(17)
    const { house, raised, terraceEnd, terraceWest } = SITE
    const wide = PERGOLA_FRONT - 0.075
    // Devant les baies : le massif et ses carreaux, à la hauteur surélevée.
    const [block, tiles, westBlock, westTiles] = meshes
    expect(sizeOf(block).width).toBeCloseTo(wide)
    expect(sizeOf(block).depth).toBeCloseTo(terraceEnd - terraceWest)
    expect(tiles.material).toBe(m.terrace)
    expect(tiles.position.y).toBeCloseTo(raised)
    expect(boundsOf(tiles).min.x).toBeCloseTo(house[0] - wide)
    // Il tourne le coin et longe la façade ouest.
    expect(sizeOf(westBlock).depth).toBe(TERRACE)
    expect(westTiles.position.y).toBeCloseTo(raised)
    expect(boundsOf(westTiles).max.x).toBeCloseTo(house[1] - BASE.setback)
    // Deux marches de 30 cm, aux deux tiers puis au tiers de la hauteur.
    expect(meshes[5].position.y).toBeCloseTo((raised * 2) / 3)
    expect(meshes[7].position.y).toBeCloseTo(raised / 3)
    expect(boundsOf(meshes[7]).min.z).toBeCloseTo(terraceEnd + 0.3)
    expect(boundsOf(meshes[7]).max.z).toBeCloseTo(terraceEnd + 0.6)
    // Les murets : tous de la hauteur des carreaux surélevés, posés au sol.
    const walls = meshes.filter((mesh) => mesh.material === m.wall)
    expect(walls).toHaveLength(7)
    for (const wall of walls) {
      expect(sizeOf(wall).height).toBeCloseTo(raised)
      expect(wall.position.y).toBeCloseTo(raised / 2)
    }
    // Le premier est sur la ligne des pieds de devant de la pergola.
    expect(walls[0].position.x).toBeCloseTo(house[0] - PERGOLA_FRONT)
    // La terre des deux jardinières s'interrompt devant la porte-fenêtre.
    const earth = meshes.filter((mesh) => mesh.geometry.type === 'BoxGeometry' && Math.abs(sizeOf(mesh).width - 0.28) < 1e-9)
    expect(earth).toHaveLength(2)
    expect(earth[0].material).toBe(earth[1].material)
    expect(boundsOf(earth[0]).max.z).toBeLessThan(PATIO_DOOR.z - PATIO_DOOR.width / 2)
    expect(boundsOf(earth[1]).min.z).toBeGreaterThan(PATIO_DOOR.z + PATIO_DOOR.width / 2)
    expect(boundsOf(earth[1]).max.z).toBeLessThan(gardenZ(PAVING.pathWest))
    // Tout reste sous le sol de la maison.
    for (const mesh of meshes) expect(boundsOf(mesh).max.y).toBeLessThanOrEqual(BASE.rise)
    expect(ROOM.xMin).toBeGreaterThan(boundsOf(block).max.x)
  })
})
