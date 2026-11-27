import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { BASE, ENTRY, OUTER_WALL, PATIO_DOOR, ROOM, SAS } from '@/components/Kitchen3D/constants'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { GRASS, LOT, LOW, PAVING, TERRACE } from './constants'
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
    expect(meshes).toHaveLength(4)
    expect(meshes.map((mesh) => mesh.material)).toEqual([m.terrace, m.terrace, m.terrace, m.concrete])
    expect(meshes.map((mesh) => mesh.position.y)).toEqual([-0.008, -0.008, -0.008, -0.012])
    // Le sol de la cage couvre toute la cage.
    const cage = boundsOf(meshes[1])
    expect(cage.min.x).toBeCloseTo(SITE.cageX1)
    expect(cage.max.x).toBeCloseTo(SITE.cageX2)
    expect(cage.min.z).toBeCloseTo(SITE.cageZ1)
    expect(cage.max.z).toBeCloseTo(SITE.cageZ2)
    // Le chemin du portillon part du sud du pavage.
    const path = boundsOf(meshes[2])
    expect(path.max.x).toBeCloseTo(gardenX(PAVING.south))
    expect(path.min.x).toBeCloseTo(gardenX(PAVING.pathEnd))
    expect(path.min.z).toBeCloseTo(gardenZ(PAVING.pathWest))
    expect(path.max.z).toBeCloseTo(gardenZ(PAVING.pathEast))
    // L'allée de béton est à l'ouest de la maison.
    expect(boundsOf(meshes[3]).max.z).toBeLessThan(SITE.house[2])
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
