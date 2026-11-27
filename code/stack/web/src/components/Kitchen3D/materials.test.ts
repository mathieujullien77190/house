import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { COLORS } from './constants'
import { faceted, furnitureMaterials, gardenMaterials, kitchenMaps, kitchenMaterials, mirrorGlass, oldBrass, roomMaterials } from './materials'

describe('les recettes', () => {
  it('le laiton vieilli et la glace : un nouvel exemplaire à chaque appel', () => {
    expect(oldBrass()).not.toBe(oldBrass())
    expect(oldBrass().color.getHex()).toBe(0xb08d3a)
    expect(oldBrass().metalness).toBe(0.7)
    expect(mirrorGlass().roughness).toBe(0.1)
    expect(mirrorGlass().metalness).toBe(0.8)
  })

  it('un matériau à facettes pour les arbres et les plantes', () => {
    const material = faceted(0x336633, 0.9)
    expect(material.flatShading).toBe(true)
    expect(material.color.getHex()).toBe(0x336633)
    expect(material.roughness).toBe(0.9)
  })
})

describe('les jeux de matériaux', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('la cuisine et le gros œuvre : le lambris et le carrelage viennent des textures données, les caissons des couleurs de la cuisine', () => {
    const maps = kitchenMaps()
    expect(maps.lambris).not.toBe(maps.tile)
    const materials = kitchenMaterials(maps)
    expect(materials.lambris.map).toBe(maps.lambris)
    expect(materials.tile.map).toBe(maps.tile)
    expect(materials.door.color.getHex()).toBe(COLORS.cabinet)
    expect(materials.wall.color.getHex()).toBe(COLORS.wall)
    // Le bois (plan de travail, poutres, étagères) est une texture ; l'inox se voit des deux côtés (la hotte est une tôle).
    for (const wood of [materials.worktop, materials.beam, materials.shelf]) expect(wood.map).toBeInstanceOf(THREE.CanvasTexture)
    expect(materials.steel.side).toBe(THREE.DoubleSide)
    expect(materials.steel.metalness).toBe(0.85)
    // La vitre est presque invisible.
    expect(materials.glass.transparent).toBe(true)
    expect(materials.glass.opacity).toBe(0.14)
  })

  it('un jeu par scène : chaque appel rend ses propres matériaux, tous différents entre eux', () => {
    for (const make of [() => kitchenMaterials(kitchenMaps()), furnitureMaterials, roomMaterials, gardenMaterials]) {
      const first: Record<string, THREE.Material> = make()
      const second: Record<string, THREE.Material> = make()
      const all = Object.values(first)
      expect(new Set(all).size).toBe(all.length)
      for (const [name, material] of Object.entries(first)) expect(second[name]).not.toBe(material)
    }
  })

  it('le mobilier : les ampoules ne dépendent pas de la lumière, les lames des volets luisent un peu', () => {
    const materials = furnitureMaterials()
    expect(materials.bulb).toBeInstanceOf(THREE.MeshBasicMaterial)
    expect(materials.slat.emissive.getHex()).toBe(0xe6e8ea)
    expect(materials.slat.emissiveIntensity).toBe(0.25)
    expect(materials.wicker.side).toBe(THREE.DoubleSide)
    // Le même bleu nuit pour les rideaux du salon et ceux des chambres, le même blanc pour les menuiseries.
    const rooms = roomMaterials()
    expect(rooms.curtain.color.getHex()).toBe(materials.curtain.color.getHex())
    expect(rooms.white.color.getHex()).toBe(materials.white.color.getHex())
    expect(rooms.metal.color.getHex()).toBe(materials.metal.color.getHex())
    expect(rooms.bulb).toBeInstanceOf(THREE.MeshBasicMaterial)
  })

  it('le jardin : la pelouse et les sols se voient des deux côtés, la terrasse est en terre cuite, le douglas est veiné', () => {
    const materials = gardenMaterials()
    for (const flat of [materials.grass, materials.terrace, materials.concrete]) expect(flat.side).toBe(THREE.DoubleSide)
    expect(materials.terrace.map).toBeInstanceOf(THREE.CanvasTexture)
    expect(materials.post.map).toBeInstanceOf(THREE.CanvasTexture)
    expect(materials.grass.map).toBeNull()
    // Les marches et les murets sont du même béton, mais deux matériaux.
    expect(materials.riser.color.getHex()).toBe(materials.wall.color.getHex())
    expect(materials.riser).not.toBe(materials.wall)
  })
})
