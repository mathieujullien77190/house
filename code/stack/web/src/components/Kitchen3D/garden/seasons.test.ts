import * as THREE from 'three'
import { grassTufts, lawnFlowers } from './grass'
import { laurelBush } from './laurel'
import { bush, choisya, creeper, fern, flowerPatch, hydrangea, passionflower, spireaHedge, wisteria } from './plants'
import { applySeason, AUTUMN, foliage, inSeason, LAUREL_SUMMER, SEASON_SHOWS, SEASONS, seasonOf } from './seasons'
import type { Season, SeasonKey } from './seasons'
import { cherryTree, clippedTree, medlarTree, prunusTree } from './trees'

/** Les objets d'une plante qui portent cette marque de saison. */
const marked = (root: THREE.Object3D, key: SeasonKey): THREE.Mesh[] => {
  const found: THREE.Mesh[] = []
  root.traverse((object) => {
    if (object.userData.season === key) found.push(object as THREE.Mesh)
  })
  return found
}
/** Vrai si la plante a de quoi montrer sous cette marque, et que tout l'est (ou que rien ne l'est). */
const shown = (root: THREE.Object3D, key: SeasonKey): boolean => {
  const parts = marked(root, key)
  expect(parts.length).toBeGreaterThan(0)
  expect(new Set(parts.map((part) => part.visible)).size).toBe(1)
  return parts[0].visible
}
const colorsOf = (root: THREE.Object3D, key: SeasonKey): Set<number> => new Set(marked(root, key).map((part) => (part.material as THREE.MeshStandardMaterial).color.getHex()))
const limbsOf = (root: THREE.Object3D): THREE.Mesh[] => (root.children as THREE.Mesh[]).filter((child) => child.isMesh && child.geometry.type === 'CylinderGeometry')
/** Ce qu'une plante montre à chaque saison, pour ces marques. */
const yearOf = (root: THREE.Object3D, keys: SeasonKey[]): Record<Season, boolean[]> =>
  Object.fromEntries(
    SEASONS.map((season) => {
      applySeason(root, season)
      return [season, keys.map((key) => shown(root, key))]
    }),
  ) as Record<Season, boolean[]>
/** Une plante qui s'ajoute à un groupe. */
const grown = (plant: (group: THREE.Group) => void): THREE.Group => {
  const group = new THREE.Group()
  plant(group)
  return group
}

describe('seasonOf', () => {
  it('la saison du jour, dans l’hémisphère nord', () => {
    const on = (month: number, day: number) => seasonOf(new Date(2026, month - 1, day, 12))
    expect([on(3, 19), on(3, 20), on(6, 20)]).toEqual(['winter', 'spring', 'spring'])
    expect([on(6, 21), on(9, 22)]).toEqual(['summer', 'summer'])
    expect([on(9, 23), on(11, 27), on(12, 20)]).toEqual(['autumn', 'autumn', 'autumn'])
    expect([on(12, 21), on(1, 1), on(2, 28)]).toEqual(['winter', 'winter', 'winter'])
  })
})

describe('inSeason, foliage', () => {
  it('marque un objet et le rend', () => {
    const mesh = new THREE.Mesh()
    expect(inSeason(mesh, 'blossom')).toBe(mesh)
    expect(mesh.userData.season).toBe('blossom')
  })

  it('un matériau à facettes par teinte, qui retient sa teinte et celles des autres saisons (une palette plus courte se répète)', () => {
    const [first, second, third] = foliage([0x111111, 0x222222, 0x333333], 0.7, { autumn: [0xaa0000, 0xbb0000], summer: [0x00cc00] })
    expect(first.flatShading).toBe(true)
    expect(first.roughness).toBe(0.7)
    expect([first, second, third].map((material) => material.color.getHex())).toEqual([0x111111, 0x222222, 0x333333])
    expect(first.userData.foliage).toEqual({ base: 0x111111, tones: { autumn: 0xaa0000, summer: 0x00cc00 } })
    expect(second.userData.foliage).toEqual({ base: 0x222222, tones: { autumn: 0xbb0000, summer: 0x00cc00 } })
    expect(third.userData.foliage).toEqual({ base: 0x333333, tones: { autumn: 0xaa0000, summer: 0x00cc00 } })
    expect(foliage([0x111111], 1)[0].userData.foliage).toEqual({ base: 0x111111, tones: {} })
  })
})

describe('applySeason', () => {
  it('chaque marque se voit à ses saisons, et seulement à elles ; ce qui n’est pas marqué ne change pas', () => {
    const root = new THREE.Group()
    const keys = Object.keys(SEASON_SHOWS) as SeasonKey[]
    const parts = keys.map((key) => inSeason(new THREE.Mesh(), key))
    const plain = new THREE.Mesh()
    plain.visible = false
    root.add(...parts, plain)
    for (const season of SEASONS) {
      applySeason(root, season)
      parts.forEach((part, index) => expect(part.visible).toBe(SEASON_SHOWS[keys[index]].includes(season)))
      expect(plain.visible).toBe(false)
    }
    expect(SEASON_SHOWS).toEqual({
      evergreen: ['spring', 'summer', 'autumn', 'winter'],
      leaves: ['spring', 'summer', 'autumn'],
      blossom: ['spring'],
      cherries: ['spring'],
      daisies: ['spring', 'summer'],
      medlars: ['spring', 'summer', 'autumn'],
      harvest: ['autumn'],
      twigs: ['winter'],
    })
  })

  it('le cerisier : en fleurs blanches et en cerises au printemps, vert l’été, aux couleurs d’automne, nu l’hiver (le bois reste)', () => {
    const tree = cherryTree(7)
    const greens = new Set([0x4f8a3a, 0x5f9a44, 0x437a34])
    expect(yearOf(tree, ['leaves', 'blossom', 'cherries'])).toEqual({ spring: [true, true, true], summer: [true, false, false], autumn: [true, false, false], winter: [false, false, false] })
    expect(marked(tree, 'harvest')).toHaveLength(0)
    applySeason(tree, 'autumn')
    expect(colorsOf(tree, 'leaves')).toEqual(new Set(AUTUMN.cherry))
    // Revenu au printemps, il retrouve ses verts ; le bois ne bouge jamais.
    applySeason(tree, 'spring')
    expect(colorsOf(tree, 'leaves')).toEqual(greens)
    expect(colorsOf(tree, 'blossom')).toEqual(new Set([0xfff3f7]))
    expect(colorsOf(tree, 'cherries')).toEqual(new Set([0xb3122a]))
    applySeason(tree, 'winter')
    expect(limbsOf(tree).length).toBeGreaterThan(200)
    expect(limbsOf(tree).every((limb) => limb.visible)).toBe(true)
    // Trois fleurs par touffe ; des cerises par deux, sous une touffe sur cinq environ.
    const tufts = marked(tree, 'leaves').length
    const [blossom] = marked(tree, 'blossom') as THREE.InstancedMesh[]
    const [cherries] = marked(tree, 'cherries') as THREE.InstancedMesh[]
    expect(blossom.count).toBe(tufts * 3)
    expect(cherries.count % 2).toBe(0)
    expect(cherries.count).toBeGreaterThan(tufts * 0.2)
    expect(cherries.count).toBeLessThan(tufts * 0.6)
  })

  it('le pommier : en fleurs rosées au printemps, ses pommes en automne seulement, pas de cerises', () => {
    const tree = cherryTree(31, 0xc8402f)
    expect(yearOf(tree, ['leaves', 'blossom', 'harvest'])).toEqual({ spring: [true, true, false], summer: [true, false, false], autumn: [true, false, true], winter: [false, false, false] })
    expect(marked(tree, 'cherries')).toHaveLength(0)
    expect(colorsOf(tree, 'blossom')).toEqual(new Set([0xffdbe6]))
    expect(colorsOf(tree, 'harvest')).toEqual(new Set([0xc8402f]))
    applySeason(tree, 'autumn')
    expect(colorsOf(tree, 'leaves')).toEqual(new Set(AUTUMN.apple))
  })

  it('le prunus : en fleurs fuchsia au printemps, bordeaux l’été, cuivré en automne, nu l’hiver', () => {
    const tree = prunusTree(47)
    expect(yearOf(tree, ['leaves', 'blossom'])).toEqual({ spring: [true, true], summer: [true, false], autumn: [true, false], winter: [false, false] })
    expect(colorsOf(tree, 'blossom')).toEqual(new Set([0xe23d9c]))
    expect((marked(tree, 'blossom')[0] as THREE.InstancedMesh).count).toBe(marked(tree, 'leaves').length * 4)
    applySeason(tree, 'autumn')
    expect(colorsOf(tree, 'leaves')).toEqual(new Set(AUTUMN.prunus))
    applySeason(tree, 'summer')
    expect(colorsOf(tree, 'leaves')).toEqual(new Set([0x6b1f33, 0x7d2a3d, 0x561a2b]))
  })

  it('le néflier : ses nèfles tant qu’il a ses feuilles, roux en automne, nu l’hiver ; l’arbre taillé perd aussi ses feuilles', () => {
    const tree = medlarTree(53)
    expect(yearOf(tree, ['leaves', 'medlars'])).toEqual({ spring: [true, true], summer: [true, true], autumn: [true, true], winter: [false, false] })
    applySeason(tree, 'autumn')
    expect(colorsOf(tree, 'leaves')).toEqual(new Set(AUTUMN.medlar))
    const clipped = clippedTree(61)
    expect(yearOf(clipped, ['leaves'])).toEqual({ spring: [true], summer: [true], autumn: [true], winter: [false] })
    applySeason(clipped, 'autumn')
    expect(colorsOf(clipped, 'leaves')).toEqual(new Set([0x23472a, 0x2b5432, 0x1d3d24]))
    expect(limbsOf(clipped)).toHaveLength(16)
  })

  it('le laurier garde ses feuilles toute l’année ; l’été, un mélange de touffes jaunes et vertes', () => {
    const laurel = laurelBush(11)
    expect(yearOf(laurel, ['evergreen'])).toEqual({ spring: [true], summer: [true], autumn: [true], winter: [true] })
    expect(marked(laurel, 'leaves')).toHaveLength(0)
    expect(colorsOf(laurel, 'evergreen')).toEqual(new Set([0x2f5d2c, 0x386b33, 0x274f26]))
    applySeason(laurel, 'summer')
    expect(colorsOf(laurel, 'evergreen')).toEqual(new Set(LAUREL_SUMMER))
    // Une des trois teintes d'été est restée verte.
    expect(LAUREL_SUMMER).toContain(0x386b33)
    applySeason(laurel, 'autumn')
    expect(colorsOf(laurel, 'evergreen')).toEqual(new Set([0x2f5d2c, 0x386b33, 0x274f26]))
  })

  it('les spirées : leurs feuilles restent toute l’année (elles ne sont pas marquées), leurs fleurs blanches ne sont là qu’au printemps', () => {
    const hedge = spireaHedge([[0, 400], [200, 400]], 2.6, 0, 71)
    expect(yearOf(hedge, ['blossom'])).toEqual({ spring: [true], summer: [false], autumn: [false], winter: [false] })
    const [leaves, blooms] = (hedge.children as THREE.InstancedMesh[]).filter((child) => child.isInstancedMesh)
    expect(leaves.userData.season).toBeUndefined()
    expect(leaves.visible).toBe(true)
    expect(blooms.userData.season).toBe('blossom')
  })

  it('la glycine : ses grappes au printemps, jaune en automne, le bois seul l’hiver', () => {
    const vine = wisteria(83)
    expect(yearOf(vine, ['leaves', 'blossom'])).toEqual({ spring: [true, true], summer: [true, false], autumn: [true, false], winter: [false, false] })
    applySeason(vine, 'autumn')
    expect(colorsOf(vine, 'leaves')).toEqual(new Set(AUTUMN.wisteria))
    applySeason(vine, 'spring')
    expect(colorsOf(vine, 'leaves')).toEqual(new Set([0x6aa84f]))
    expect(limbsOf(vine).every((limb) => limb.visible)).toBe(true)
  })

  it('les arbustes : en fleurs au printemps seulement ; l’hiver, plus de feuilles, il reste le bois', () => {
    for (const shrub of [choisya(91), hydrangea(5)]) {
      expect(yearOf(shrub, ['leaves', 'blossom', 'twigs'])).toEqual({ spring: [true, true, false], summer: [true, false, false], autumn: [true, false, false], winter: [false, false, true] })
      // Le bois nu : sept tiges en deux tronçons, dans un groupe à part.
      const [twigs] = marked(shrub, 'twigs')
      expect(twigs.type).toBe('Group')
      expect(twigs.children).toHaveLength(14)
      for (const twig of twigs.children) expect(twig.position.y).toBeLessThan(0.6)
    }
    const yellow = bush(111, 1.2, 1.5, 0xf2cf2e)
    expect(yearOf(yellow, ['leaves', 'blossom'])).toEqual({ spring: [true, true], summer: [true, false], autumn: [true, false], winter: [false, false] })
    expect(limbsOf(yellow).every((limb) => limb.visible)).toBe(true)
    expect(marked(bush(112, 1.2, 1.5), 'blossom')).toHaveLength(0)
  })

  it('la fougère et les massifs de fleurs disparaissent l’hiver ; les fleurs des massifs ne sont là qu’au printemps', () => {
    const plant = fern(21)
    expect(plant.userData.season).toBe('leaves')
    expect(SEASONS.map((season) => (applySeason(plant, season), plant.visible))).toEqual([true, true, true, false])
    const patch = flowerPatch(121, 1.3, 0.6, 0xd6247f)
    expect(yearOf(patch, ['leaves', 'blossom'])).toEqual({ spring: [true, true], summer: [true, false], autumn: [true, false], winter: [false, false] })
    expect(marked(patch, 'leaves')).toHaveLength(2)
  })

  it('la passiflore : ses fleurs au printemps ; l’hiver, il ne reste que ses tiges', () => {
    const group = grown(passionflower)
    expect(yearOf(group, ['leaves', 'blossom'])).toEqual({ spring: [true, true], summer: [true, false], autumn: [true, false], winter: [false, false] })
    const stems = (group.children as THREE.Mesh[]).filter((child) => child.geometry.type === 'BoxGeometry')
    expect(stems).toHaveLength(3)
    expect(stems.every((stem) => stem.visible)).toBe(true)
  })

  it('la vigne vierge : verte (quelques feuilles rougies), toute rouge en automne avec ses grappes, les tiges seules l’hiver', () => {
    const group = grown(creeper)
    const [leaves] = marked(group, 'leaves') as THREE.InstancedMesh[]
    const base = Array.from((leaves.instanceColor as THREE.InstancedBufferAttribute).array)
    expect(yearOf(group, ['leaves', 'harvest'])).toEqual({ spring: [true, false], summer: [true, false], autumn: [true, true], winter: [false, false] })
    const hues = (): number[] => {
      const tint = new THREE.Color()
      const hsl = { h: 0, s: 0, l: 0 }
      return Array.from({ length: leaves.count }, (_, index) => {
        leaves.getColorAt(index, tint)
        return tint.getHSL(hsl).h
      })
    }
    applySeason(group, 'autumn')
    const colors = leaves.instanceColor as THREE.InstancedBufferAttribute
    const before = colors.version
    // En automne, toutes les feuilles sont rouges ou orangées.
    for (const hue of hues()) expect(hue).toBeLessThan(0.12)
    applySeason(group, 'summer')
    expect(colors.version).toBeGreaterThan(before)
    expect(Array.from(colors.array)).toEqual(base)
    // L'été, presque toutes sont vertes.
    expect(hues().filter((hue) => hue > 0.25).length).toBeGreaterThan(leaves.count * 0.8)
  })

  it('la pelouse : les pâquerettes au printemps et en été, les fleurs de couleur au printemps ; les bouquets d’herbe toute l’année', () => {
    const lawn = grown(lawnFlowers)
    expect(yearOf(lawn, ['daisies', 'blossom'])).toEqual({ spring: [true, true], summer: [true, false], autumn: [false, false], winter: [false, false] })
    expect(marked(lawn, 'daisies')).toHaveLength(2)
    const tufts = grown(grassTufts).children[0]
    expect(tufts.userData.season).toBeUndefined()
    applySeason(tufts, 'winter')
    expect(tufts.visible).toBe(true)
  })
})
