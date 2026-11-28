import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { KITCHEN, LAMP_FIXTURES, LAYOUT, MATOU_WINDOW, REST, ROOM, SAS, SCREEN_OFF } from '@/components/Kitchen3D/constants'
import { BULB_OFF } from '@/components/Kitchen3D/primitives'
import { SHUTTER_KEYS } from '@/components/Kitchen3D/shutters'
import { buildFurniture } from './furniture'

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
    expect(root.children[5].position.toArray()).toEqual([LAYOUT.dining.x, 0, LAYOUT.dining.z])
    // La bibliothèque : trois maillages de copies, puis ce qui y est rangé (switch, mini PC, box, pont Hue).
    expect(root.children[7].children.slice(0, 3).map((child) => (child as THREE.InstancedMesh).isInstancedMesh)).toEqual([true, true, true])
    // La chambre d'invité, la salle de bain, le sas et la chambre de Matou (`rooms.ts`).
    expect(root.children[16].children).toHaveLength(4)
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

  it('dix-huit ampoules de luminaires, éteintes, chacune avec son matériau ; dix-sept portent le nom de leur lampe Hue', () => {
    const { root } = furniture()
    const all = meshesOf(root).filter((mesh) => mesh.userData.fixture === true)
    expect(all).toHaveLength(18)
    expect(new Set(all.map((bulb) => bulb.material)).size).toBe(18)
    for (const bulb of all) expect((bulb.material as THREE.MeshBasicMaterial).color.getHex()).toBe(BULB_OFF)
    // L'applique du sas n'a pas de nom : elle suit la lampe de la maison la plus proche.
    const bulbs = all.filter((bulb) => bulb.userData.fixtureName !== undefined)
    expect(all.filter((bulb) => !bulbs.includes(bulb)).map((bulb) => worldOf(bulb).z > ROOM.zMax)).toEqual([true])
    const names = bulbs.map((bulb) => bulb.userData.fixtureName as string)
    expect(new Set(names).size).toBe(17)
    // Toutes sauf celles que portent le gros œuvre, la cuisine et le jardin (le couloir, la suspension de la cuisine, la lampe de la cage).
    expect([...names, 'couloir', 'cuisine 1', 'perruche'].sort()).toEqual([...LAMP_FIXTURES].sort())
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

  it('les deux écrans du bureau et la télé sont éteints : trois dalles noires, marquées pour montrer une caméra au clic', () => {
    const { root } = furniture()
    // Une dalle : un pavé de 5 mm d'épaisseur, large de 55 cm (bureau) ou de presque toute la télé.
    const slabs = meshesOf(root).filter((mesh) => {
      // (Une lame de volet est une géométrie fondue, sans cotes.)
      const size = (mesh.geometry as Partial<THREE.BoxGeometry>).parameters ?? { depth: 0, width: 0 }
      return size.depth === 0.005 && (size.width === 0.55 || size.width === LAYOUT.tv.width - 0.03)
    })
    expect(slabs.map((slab) => worldOf(slab).x).sort((a, b) => a - b)).toEqual(
      [LAYOUT.tv.x, LAYOUT.desk.x - 0.3, LAYOUT.desk.x + 0.3].sort((a, b) => a - b).map((x) => expect.closeTo(x)),
    )
    for (const slab of slabs) {
      expect((slab.material as THREE.MeshBasicMaterial).color.getHex()).toBe(SCREEN_OFF)
      expect(slab.userData.tv).toBe(true)
    }
    // Les écrans du bureau regardent vers −z (le fauteuil), la télé vers +z.
    expect(slabs.map((slab) => (slab.userData.tvFacing as number | undefined) ?? 1).sort()).toEqual([-1, -1, 1])
  })

  it('trois clims à cliquer (le salon et les deux chambres), chacune avec son voyant', () => {
    const { root } = furniture()
    const units = tagged(root, 'acUnit')
    const leds = tagged(root, 'acLed') as THREE.Mesh[]
    expect(units.map((unit) => unit.userData.acUnit)).toEqual(['salon', 'chambre-invite', 'chambre-matou'])
    expect(leds.map((led) => led.userData.acLed)).toEqual(['salon', 'chambre-invite', 'chambre-matou'])
    expect(new Set(leds.map((led) => led.material)).size).toBe(3)
    // La clim du salon est contre le mur du bureau, son voyant sur sa façade.
    expect(worldOf(units[0]).z).toBeCloseTo(ROOM.zMax - 0.12)
    expect(worldOf(leds[0]).z).toBeLessThan(worldOf(units[0]).z - 0.11)
  })

  it('une seule pendule : ses deux aiguilles', () => {
    const { root } = furniture()
    expect(tagged(root, 'clockHand').map((hand) => hand.userData.clockHand)).toEqual(['hour', 'minute'])
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
    // Quatre montants de cadre, deux séparations pour trois vitres, la vitre, les lames.
    expect(matou.children).toHaveLength(8)
    expect(root.children[17].children).toHaveLength(7)
  })

  it('les photos accrochées aux murs viennent de `public/kitchen3d/`', () => {
    const { load } = furniture()
    expect(load.mock.calls.map(([url]) => url).sort()).toEqual(
      ['city.jpg', 'cows.jpg', 'fuji.jpg', 'puzzle.jpg', 'sea.png', 'shore.jpg', 'wc-flamingo.jpg', 'wc-ink.jpg', 'wc-owl.jpg', 'wc-plants.jpg', 'wc-waxwing.jpg'].map((name) => `${import.meta.env.BASE_URL}kitchen3d/${name}`),
    )
  })

  it('le même décor à chaque ouverture (les tirages sont répétables)', () => {
    const places = () => meshesOf(furniture().root.children[10]).map((mesh) => mesh.position.toArray())
    expect(places()).toEqual(places())
  })
})
