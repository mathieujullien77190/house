import * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { KITCHEN, LAMP_FIXTURES, LAYOUT, MATOU_WINDOW, REST, ROOM, SAS, SCREEN_KEYS } from './constants'
import { buildFurniture } from './furniture'
import { SCREEN_BLUE, TV_BLACK } from './live'
import { BULB_OFF } from './primitives'
import { SHUTTER_KEYS } from './shutters'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const tagged = (root: THREE.Object3D, tag: string): THREE.Object3D[] => {
  const found: THREE.Object3D[] = []
  root.traverse((child) => {
    if (child.userData[tag] !== undefined) found.push(child)
  })
  return found
}

const worldOf = (object: THREE.Object3D): THREE.Vector3 => object.getWorldPosition(new THREE.Vector3())

/** Le mobilier, ses places dans la scène à jour ; les photos ne sont pas chargées. */
const furniture = () => {
  const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture())
  const root = buildFurniture()
  root.updateMatrixWorld(true)
  return { root, load }
}

describe('buildFurniture', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('le séjour, la salle à manger, le bureau, la bibliothèque, le coin repas, l’entrée, puis les autres pièces et deux fenêtres', () => {
    const { root } = furniture()
    expect(root.children).toHaveLength(19)
    const [sofa, table, armchair] = root.children
    expect(sofa.position.toArray()).toEqual([LAYOUT.sofa.x, 0, LAYOUT.sofa.z])
    // Le canapé regarde l'ouest (la télé), le fauteuil aussi, un peu tourné vers le canapé.
    expect(sofa.rotation.y).toBeCloseTo(Math.PI)
    expect(table.position.toArray()).toEqual([LAYOUT.coffee.x, 0, LAYOUT.coffee.z])
    expect(armchair.position.toArray()).toEqual([LAYOUT.armchair.x, 0, LAYOUT.armchair.z])
    expect(armchair.rotation.y).toBeCloseTo(Math.atan2(-0.25, -1))
    // La bibliothèque : trois maillages de copies.
    expect(root.children[7].children.map((child) => (child as THREE.InstancedMesh).isInstancedMesh)).toEqual([true, true, true])
    // La chambre d'invité, la salle de bain et le sas (`rooms.ts`).
    expect(root.children[16].children).toHaveLength(3)
  })

  it('la table ronde et ses quatre chaises tournées vers elle', () => {
    const { root } = furniture()
    const dining = root.children[5]
    expect(dining.position.toArray()).toEqual([LAYOUT.dining.x, 0, LAYOUT.dining.z])
    // Les trois poutres du pied sont des groupes au centre ; les chaises sont autour.
    const groups = dining.children.filter((child) => child.type === 'Group')
    expect(groups).toHaveLength(7)
    const chairs = groups.filter((child) => Math.hypot(child.position.x, child.position.z) > 0.1)
    expect(chairs).toHaveLength(4)
    for (const chair of chairs) {
      expect(Math.hypot(chair.position.x, chair.position.z)).toBeCloseTo(0.82)
      // Son devant (+z, tourné) pointe vers le centre de la table.
      expect(Math.sin(chair.rotation.y)).toBeCloseTo(-chair.position.x / 0.82)
      expect(Math.cos(chair.rotation.y)).toBeCloseTo(-chair.position.z / 0.82)
    }
  })

  it('tout tient dans la maison, entre le sol et le plafond', () => {
    const { root } = furniture()
    const meshes = meshesOf(root).filter((mesh) => !(mesh as THREE.InstancedMesh).isInstancedMesh)
    expect(meshes.length).toBeGreaterThan(900)
    for (const mesh of meshes) {
      const { x, y, z } = worldOf(mesh)
      expect(x).toBeGreaterThanOrEqual(ROOM.xMin - 0.1)
      expect(x).toBeLessThanOrEqual(ROOM.xMax + 0.1)
      expect(z).toBeGreaterThanOrEqual(REST.west - 0.1)
      expect(z).toBeLessThanOrEqual(SAS.east + 0.1)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThanOrEqual(ROOM.height)
    }
  })

  it('quinze ampoules de luminaires, éteintes, chacune avec son matériau et le nom de sa lampe Hue', () => {
    const { root } = furniture()
    const bulbs = meshesOf(root).filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs).toHaveLength(15)
    expect(new Set(bulbs.map((bulb) => bulb.material)).size).toBe(15)
    for (const bulb of bulbs) expect((bulb.material as THREE.MeshBasicMaterial).color.getHex()).toBe(BULB_OFF)
    const names = bulbs.map((bulb) => bulb.userData.fixtureName as string)
    expect(new Set(names).size).toBe(15)
    // Toutes sauf les deux que porte la pièce elle-même (`helpers.ts` : le couloir et la suspension de la cuisine).
    expect([...names, 'couloir', 'cuisine 1'].sort()).toEqual([...LAMP_FIXTURES].sort())
    const placeOf = (name: string) => worldOf(bulbs[names.indexOf(name)])
    const near = (name: string, x: number, z: number) => Math.hypot(placeOf(name).x - x, placeOf(name).z - z)
    // Le salon, le coin repas, le bar (deux), le bureau (deux lampes et le plafonnier).
    expect(near('salon', -3.7, 0.9)).toBeCloseTo(0)
    expect(near('cuisine 2', LAYOUT.nookLamp.x - 0.3, LAYOUT.nookLamp.z)).toBeCloseTo(0)
    expect(near('bar 2', KITCHEN.xMin - 0.09, 0.4)).toBeCloseTo(0)
    expect(near('bar 1', KITCHEN.xMin - 0.09, 1)).toBeCloseTo(0)
    expect(near('salle à manger', LAYOUT.desk.x, LAYOUT.desk.z - 0.7)).toBeCloseTo(0)
    expect(near('ordi 1', LAYOUT.desk.x - 0.75, LAYOUT.desk.z + 0.26)).toBeCloseTo(0)
    expect(near('ordi 2', LAYOUT.desk.x + 0.75, LAYOUT.desk.z + 0.26)).toBeCloseTo(0)
  })

  it('les écrans qui montrent les caméras : les deux du bureau et la télé, chacun avec son matériau', () => {
    const { root } = furniture()
    const screens = tagged(root, 'cameraScreen') as THREE.Mesh[]
    const byKey = Object.fromEntries(screens.map((screen) => [screen.userData.cameraScreen as string, screen]))
    expect(Object.keys(byKey).sort()).toEqual([...SCREEN_KEYS].sort())
    expect(new Set(screens.map((screen) => screen.material)).size).toBe(3)
    for (const screen of screens) expect((screen.material as THREE.MeshBasicMaterial).color.getHex()).toBe(screen.userData.screenOff)
    // La télé, sur le mur ouest, regarde le salon (+z) ; les écrans du bureau, contre le mur est, regardent le fauteuil (−z).
    expect(byKey.tv.userData).toMatchObject({ screenOff: TV_BLACK, screenFacing: 1 })
    expect(byKey.left.userData).toMatchObject({ screenOff: SCREEN_BLUE, screenFacing: -1 })
    expect(byKey.right.userData).toMatchObject({ screenOff: SCREEN_BLUE, screenFacing: -1 })
    expect(worldOf(byKey.tv).x).toBeCloseTo(LAYOUT.tv.x)
    // Pour qui est assis face au mur est, la gauche est côté +x.
    expect(worldOf(byKey.left).x).toBeCloseTo(LAYOUT.desk.x + 0.3)
    expect(worldOf(byKey.right).x).toBeCloseTo(LAYOUT.desk.x - 0.3)
  })

  it('les clims du salon et de la chambre d’invité : un bloc à cliquer et son voyant', () => {
    const { root } = furniture()
    const units = tagged(root, 'acUnit')
    const leds = tagged(root, 'acLed') as THREE.Mesh[]
    expect(units.map((unit) => unit.userData.acUnit)).toEqual(['salon', 'chambre-invite'])
    expect(leds.map((led) => led.userData.acLed)).toEqual(['salon', 'chambre-invite'])
    expect(leds[0].material).not.toBe(leds[1].material)
    // La clim du salon est contre le mur du bureau, son voyant sur sa façade.
    expect(worldOf(units[0]).z).toBeCloseTo(ROOM.zMax - 0.12)
    expect(worldOf(leds[0]).z).toBeLessThan(worldOf(units[0]).z - 0.11)
  })

  it('la pendule au-dessus du frigo : deux aiguilles autour du même centre, son cadran dessiné', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    const { root } = furniture()
    const hands = tagged(root, 'clockHand')
    expect(hands.map((hand) => hand.userData.clockHand)).toEqual(['hour', 'minute'])
    expect(hands[0].position.toArray()).toEqual(hands[1].position.toArray())
    expect(hands[0].position.x).toBe(LAYOUT.fridge.x)
    // La grande aiguille est plus longue que la petite.
    const lengthOf = (hand: THREE.Object3D) => ((hand.children[0] as THREE.Mesh).geometry as THREE.BoxGeometry).parameters.height
    expect(lengthOf(hands[1])).toBeGreaterThan(lengthOf(hands[0]))
    const texts = (context.fillText.mock.calls as [string, number, number][]).map(([text]) => text)
    expect(texts).toEqual([...Array.from({ length: 12 }, (_, index) => String(index + 1)), 'Q U A R T Z'])
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 6)
  })

  it('les fenêtres à volet roulant portent le nom de leur volet et la surface de leur vitre', () => {
    const { root } = furniture()
    const shutters = tagged(root, 'shutter')
    expect(shutters.map((shutter) => shutter.userData.shutter as string).sort()).toEqual([...SHUTTER_KEYS].sort())
    for (const shutter of shutters) {
      // En attendant l'état du vrai volet : la moitié haute des lames.
      expect(shutter.visible).toBe(true)
      const shown = shutter.children.filter((slat) => slat.visible).length
      expect(shown).toBe(Math.ceil(shutter.children.length / 2))
      expect(shutter.children[0].visible).toBe(true)
      expect(shutter.children.at(-1)?.visible).toBe(false)
    }
    const office = shutters.find((shutter) => shutter.userData.shutter === 'pc') as THREE.Object3D
    expect(office.userData.area).toBeCloseTo(1.1)
    expect(office.parent).toBe(root.children[17])
    // Le cadre est dans l'embrasure du mur des baies : sa face ressort d'un centimètre dans la pièce.
    expect(root.children[17].position.x).toBeCloseTo(ROOM.xMin - 0.025)
    expect(root.children[17].position.z).toBe(LAYOUT.libraryWindow.z)
    // La fenêtre du coin repas est dans le mur d'en face : tournée dans l'autre sens.
    const kitchen = shutters.find((shutter) => shutter.userData.shutter === 'cuisine') as THREE.Object3D
    expect(kitchen.parent?.position.x).toBeCloseTo(ROOM.xMax + 0.025)
  })

  it('la fenêtre de la chambre de Matou n’a pas de volet relié : trois vitres, pas de lames', () => {
    const { root } = furniture()
    const matou = root.children[18]
    expect(matou.position.z).toBe(MATOU_WINDOW.z)
    const [slats] = matou.children.filter((child) => child.type === 'Group')
    expect(slats.visible).toBe(false)
    expect(slats.userData.shutter).toBeUndefined()
    // Quatre montants de cadre, deux séparations pour trois vitres, la vitre.
    expect(matou.children).toHaveLength(8)
    expect(root.children[17].children).toHaveLength(7)
  })

  it('les photos accrochées aux murs viennent de `public/kitchen3d/`', () => {
    const { load } = furniture()
    expect(load.mock.calls.map(([url]) => url).sort()).toEqual(['city.jpg', 'cows.jpg', 'fuji.jpg', 'puzzle.jpg', 'sea.png', 'shore.jpg'].map((name) => `${import.meta.env.BASE_URL}kitchen3d/${name}`))
  })

  it('le même décor à chaque ouverture (les tirages sont répétables)', () => {
    const places = () => meshesOf(furniture().root.children[10]).map((mesh) => mesh.position.toArray())
    expect(places()).toEqual(places())
  })
})
