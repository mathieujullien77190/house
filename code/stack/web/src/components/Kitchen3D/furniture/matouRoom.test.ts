import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { LAMP_FIXTURES, REST, ROOM } from '@/components/Kitchen3D/constants'
import { roomMaterials } from '@/components/Kitchen3D/materials'
import { BULB_OFF } from '@/components/Kitchen3D/primitives'
import { matouRoom } from './matouRoom'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

describe('matouRoom', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  const middleX = (ROOM.xMin + REST.corridorSouth) / 2

  it('la clim de la chambre de Matou, en haut du mur ouest : un bloc à cliquer et son voyant sur la façade', () => {
    const meshes = meshesOf(matouRoom(roomMaterials()))
    const units = meshes.filter((mesh) => mesh.userData.acUnit !== undefined)
    const leds = meshes.filter((mesh) => mesh.userData.acLed !== undefined)
    expect(units.map((mesh) => mesh.userData.acUnit)).toEqual(['chambre-matou'])
    expect(leds.map((mesh) => mesh.userData.acLed)).toEqual(['chambre-matou'])
    expect(units[0].position.toArray()).toEqual([middleX, 2.05, REST.west + 0.12])
    // Le voyant : devant le bloc (vers la pièce), en bas.
    expect(leds[0].position.z).toBeGreaterThan(units[0].position.z + 0.11)
    expect(leds[0].position.y).toBeLessThan(units[0].position.y)
    expect((leds[0].material as THREE.MeshBasicMaterial).type).toBe('MeshBasicMaterial')
  })

  it('la suspension au milieu de la pièce porte le nom de sa lampe Hue, connu de la scène', () => {
    const meshes = meshesOf(matouRoom(roomMaterials()))
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['hue ambiance lamp 1'])
    expect(LAMP_FIXTURES).toContain('hue ambiance lamp 1')
    expect(bulbs[0].position.toArray()).toEqual([middleX, ROOM.height - 0.52, (REST.west + REST.matouEast) / 2])
    expect((bulbs[0].material as THREE.MeshBasicMaterial).color.getHex()).toBe(BULB_OFF)
    // L'abat-jour en cloche, ouvert, juste au-dessus de l'ampoule.
    const shade = meshes.find((mesh) => mesh.geometry.type === 'ConeGeometry') as THREE.Mesh
    expect((shade.geometry as THREE.ConeGeometry).parameters.openEnded).toBe(true)
    expect(shade.position.x).toBe(bulbs[0].position.x)
    expect(shade.position.y).toBeGreaterThan(bulbs[0].position.y)
  })

  it('sept pièces en tout : la clim (bloc, voyant, barre) et la suspension (rosace, fil, abat-jour, ampoule)', () => {
    expect(matouRoom(roomMaterials()).children).toHaveLength(7)
  })
})
