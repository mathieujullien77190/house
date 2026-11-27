import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { CABINET, COUNTER_TOP, ENTRY, KITCHEN, LAYOUT, NICHES, PARTITION, PASSAGE, RECESS, ROOM, SALON_BAYS, SHELL, WORKTOP } from '@/components/Kitchen3D/constants'
import { kitchenMaps, kitchenMaterials } from '@/components/Kitchen3D/materials'
import { beams, entryWalls, livingCeiling, livingFloors, livingWalls, partition, stairWall, thickSkirtings } from './living'
import { wallKit } from './walls'
import type { Shell } from './walls'

/** Un gros œuvre vide, prêt à recevoir ce qu'un constructeur y ajoute. */
const emptyShell = (): Shell => {
  const maps = kitchenMaps()
  const materials = kitchenMaterials(maps)
  const group = new THREE.Group()
  return { group, materials, maps, floors: [], sill: new THREE.MeshStandardMaterial(), ...wallKit(group, materials) }
}
const meshes = (shell: Shell) => shell.group.children as THREE.Mesh[]
const boxOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters
const planeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.PlaneGeometry).parameters
const planes = (shell: Shell) => meshes(shell).filter((mesh) => mesh.geometry.type === 'PlaneGeometry')
const boxes = (shell: Shell) => meshes(shell).filter((mesh) => mesh.geometry.type === 'BoxGeometry')

describe('l’espace de vie', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('le sol : un fond sombre sous chaque pièce, inscrite pour le parquet', () => {
    const shell = emptyShell()
    livingFloors(shell)
    // Le salon, la bande du claustra, l'entrée, la cuisine.
    expect(shell.floors).toHaveLength(4)
    expect(shell.floors[0]).toEqual([ROOM.xMin, ENTRY.x, ROOM.zMin, ROOM.zMax])
    expect(shell.floors[3]).toEqual([KITCHEN.xMin, KITCHEN.xMax, KITCHEN.zMin, KITCHEN.zMax])
    const slabs = meshes(shell)
    expect(slabs).toHaveLength(4)
    for (const slab of slabs) {
      expect(slab.material).toBe(shell.materials.floor)
      expect(slab.position.y).toBeLessThan(0)
      expect(slab.rotation.x).toBeCloseTo(-Math.PI / 2)
    }
    expect(planeOf(slabs[0])).toMatchObject({ width: expect.closeTo(ENTRY.x - ROOM.xMin), height: expect.closeTo(ROOM.zMax - ROOM.zMin) })
  })

  it('les murs : tournés vers la pièce, le mur de la télé percé de la porte du couloir, les baies au sud et les fenêtres au nord', () => {
    const shell = emptyShell()
    livingWalls(shell)
    // Deux pans à plinthe et le linteau de la porte, les baies du salon (dix pans, une plinthe), le mur du bureau, celui de la hotte, les
    // fenêtres de la cuisine (dix pans, une plinthe).
    expect(shell.group.children).toHaveLength(5 + 11 + 2 + 2 + 11)
    const lintel = planes(shell).find((plane) => plane.position.z === ROOM.zMin && Math.abs(plane.position.x - LAYOUT.door.x) < 1e-9) as THREE.Mesh
    expect(planeOf(lintel)).toMatchObject({ width: expect.closeTo(LAYOUT.door.width), height: expect.closeTo(ROOM.height - PASSAGE.top) })
    expect(lintel.rotation.y).toBe(0)
    // La façade des baies, le long de z, regarde le nord (+x) ; le mur des fenêtres de la cuisine, en face, le sud.
    const south = planes(shell).filter((plane) => plane.position.x === ROOM.xMin)
    expect(south).toHaveLength(SALON_BAYS.length * 3 + 1)
    for (const plane of south) expect(plane.rotation.y).toBeCloseTo(Math.PI / 2)
    const north = planes(shell).filter((plane) => plane.position.x === ROOM.xMax)
    expect(north).toHaveLength(10)
    for (const plane of north) expect(plane.rotation.y).toBeCloseTo(-Math.PI / 2)
    // Le mur de la hotte est 30 cm plus à l'est que celui de la télé.
    expect(planes(shell).filter((plane) => plane.position.z === KITCHEN.zMin).map((plane) => planeOf(plane).width)).toEqual([KITCHEN.xMax - KITCHEN.xMin])
    for (const mesh of planes(shell)) expect(mesh.material).toBe(shell.materials.wall)
  })

  it('le plafond : du lambris partout, et la plaque de plâtre de la cuisine juste en dessous', () => {
    const shell = emptyShell()
    livingCeiling(shell)
    const [living, , , kitchen, plaster] = meshes(shell)
    expect(shell.group.children).toHaveLength(5)
    expect(living.material).toBe(shell.materials.lambris)
    expect(living.position.y).toBe(ROOM.height)
    expect(plaster.material).toBe(shell.materials.plaster)
    expect(plaster.position.y).toBeLessThan(kitchen.position.y)
    expect(plaster.position.y).toBeCloseTo(ROOM.height, 2)
    expect(planeOf(plaster)).toEqual(expect.objectContaining({ width: KITCHEN.xMax - KITCHEN.xMin, height: KITCHEN.zMax - KITCHEN.zMin }))
    expect(plaster.rotation.x).toBeCloseTo(Math.PI / 2)
  })

  it('entre la cuisine et le salon : le mur plein, le bar lambrissé de bleu sous sa tablette, le retour de mur du frigo', () => {
    const shell = emptyShell()
    partition(shell)
    const parts = meshes(shell)
    expect(parts).toHaveLength(17)
    const [solid, , panel, top, ledge, strip] = parts
    expect(boxOf(solid)).toMatchObject({ width: PARTITION.thickness, height: ROOM.height, depth: PARTITION.wall })
    expect(solid.position.z + PARTITION.wall / 2).toBeCloseTo(SHELL.barStart)
    // Le lambris bleu du bar est au nu du mur plein, côté salon.
    expect(panel.material).toBe(shell.materials.door)
    expect(panel.position.x - 0.01).toBeCloseTo(SHELL.salonX)
    expect(boxOf(panel)).toMatchObject({ height: PARTITION.height, depth: PARTITION.bar })
    // La tablette est posée sur le muret, et dépasse côté salon.
    expect(top.position.y - 0.02).toBeCloseTo(PARTITION.height)
    expect(top.position.x - boxOf(top).width / 2).toBeLessThan(SHELL.salonX)
    // La tablette et la bande du rebord partagent un bois dont les veines suivent la longueur.
    expect(strip.material).toBe(top.material)
    expect(((top.material as THREE.MeshStandardMaterial).map as THREE.Texture).rotation).toBeCloseTo(Math.PI / 2)
    // Le rebord longe tout le mur, du fond de la cuisine au bout du bar.
    expect(boxOf(ledge).depth).toBeCloseTo(SHELL.barStart + PARTITION.bar - KITCHEN.zMin)
    // Le bout du bar : sept rainures sous le plan de travail, une plinthe en bas.
    const grooves = parts.filter((part) => part.material === shell.materials.carcass)
    expect(grooves).toHaveLength(7)
    for (const groove of grooves) expect(boxOf(groove).height).toBeCloseTo(COUNTER_TOP - WORKTOP.thickness - 0.1)
    expect(grooves.at(-1)?.position.x).toBeLessThan(KITCHEN.xMin + PARTITION.ledge + CABINET.depth)
    expect(parts.filter((part) => part.material === shell.materials.beam)).toHaveLength(1)
    const back = parts.at(-1) as THREE.Mesh
    expect(boxOf(back).depth).toBeCloseTo(SHELL.entryBack - SHELL.returnStart)
    expect(back.position.x).toBeCloseTo(SHELL.wallX)
  })

  it('le mur de l’escalier : trois niches, le cellier parqueté, le casier carré sous la niche à verres, un dos fermé', () => {
    const shell = emptyShell()
    stairWall(shell)
    // Seul le cellier a un sol : il est inscrit pour le parquet.
    const cellar = NICHES.find((niche) => niche.id === 'cellar') as (typeof NICHES)[number]
    expect(shell.floors).toEqual([[cellar.x - cellar.inner / 2, cellar.x + cellar.inner / 2, KITCHEN.zMax, KITCHEN.zMax + cellar.depth]])
    // Un plafond par niche, à sa hauteur.
    const tops = planes(shell).filter((plane) => Math.abs(plane.rotation.x - Math.PI / 2) < 1e-9)
    expect(tops.map((top) => top.position.y)).toEqual([...NICHES].sort((a, b) => a.x - b.x).map((niche) => niche.height))
    // Le casier : un creux dont on ne voit que l'intérieur, sous la niche à verres.
    const hollows = boxes(shell).filter((mesh) => (mesh.material as THREE.Material).side === THREE.BackSide)
    expect(hollows).toHaveLength(1)
    const bar = NICHES.find((niche) => niche.id === 'bar') as (typeof NICHES)[number]
    expect(hollows[0].position.x).toBe(bar.x)
    expect(boxOf(hollows[0])).toMatchObject({ width: RECESS.width, height: expect.closeTo(RECESS.top - RECESS.bottom), depth: RECESS.depth })
    // Les plinthes : quatre pans pleins côté cuisine, le bas du casier, et les trois côtés du cellier.
    expect(boxes(shell).filter((mesh) => mesh.material === shell.materials.beam)).toHaveLength(8)
    // Le dos : au-delà de la plus profonde des niches, coiffé juste au-dessus du plafond.
    const back = planes(shell).filter((plane) => plane.position.z === SHELL.shellBack)
    expect(back).toHaveLength(1)
    expect(SHELL.shellBack).toBeGreaterThan(KITCHEN.zMax + Math.max(...NICHES.map((niche) => niche.depth)))
    const lid = meshes(shell).at(-1) as THREE.Mesh
    expect(lid.position.y).toBeGreaterThan(ROOM.height)
    expect(lid.rotation.x).toBeCloseTo(-Math.PI / 2)
  })

  it('l’entrée : trois pans, dont celui de la porte sans plinthe sous elle, et le mur plein qui prolonge le claustra', () => {
    const shell = emptyShell()
    entryWalls(shell)
    expect(shell.group.children).toHaveLength(8)
    expect(planes(shell)).toHaveLength(3)
    // Le mur de la porte : deux plinthes, une de chaque côté de la porte, rien dessous.
    const skirtings = meshes(shell).filter((mesh) => mesh.geometry.type === 'BoxGeometry' && mesh.material === shell.materials.beam && Math.abs(mesh.position.z - ENTRY.doorZ) < 0.1)
    expect(skirtings).toHaveLength(2)
    const [west, east] = skirtings.sort((a, b) => a.position.x - b.position.x)
    expect(west.position.x).toBeLessThan(ENTRY.doorX - ENTRY.doorWidth / 2)
    expect(east.position.x).toBeGreaterThan(ENTRY.doorX + ENTRY.doorWidth / 2)
    expect(skirtings.every((skirting) => skirting.position.x < ENTRY.doorX - ENTRY.doorWidth / 2 || skirting.position.x > ENTRY.doorX + ENTRY.doorWidth / 2)).toBe(true)
    const thick = meshes(shell).at(-1) as THREE.Mesh
    expect(boxOf(thick)).toMatchObject({ width: 0.12, height: ROOM.height, depth: expect.closeTo(ROOM.zMax - ENTRY.wallZ) })
    expect(thick.position.x).toBe(ENTRY.x)
    // Le mur de la porte.
    expect(planes(shell)[0].position.z).toBe(ENTRY.doorZ)
  })

  it('les plinthes des murs épais : sept, toutes en chêne', () => {
    const shell = emptyShell()
    thickSkirtings(shell)
    const skirtings = meshes(shell)
    expect(skirtings).toHaveLength(7)
    for (const skirting of skirtings) expect(skirting.material).toBe(shell.materials.beam)
    // Côté salon, une seule plinthe pour le mur plein et le bar.
    expect(boxOf(skirtings[0]).depth).toBeCloseTo(PARTITION.wall + PARTITION.bar + 0.02 + 0.032)
    // De chaque côté du mur qui prolonge le claustra.
    expect(skirtings[3].position.x).toBeLessThan(ENTRY.x)
    expect(skirtings[4].position.x).toBeGreaterThan(ENTRY.x)
  })

  it('les poutres de chêne : 12 cm de côté, sous le plafond', () => {
    const shell = emptyShell()
    beams(shell)
    const all = meshes(shell)
    expect(all).toHaveLength(4)
    for (const beam of all) {
      expect(beam.material).toBe(shell.materials.beam)
      expect(boxOf(beam).height).toBe(0.12)
      expect(beam.position.y + 0.06).toBeCloseTo(ROOM.height)
    }
    // Au-dessus du bar et de l'ouverture, puis celle qui coupe le salon en deux, du poteau au mur des baies.
    expect(boxOf(all[0]).depth).toBeCloseTo(SHELL.returnStart - SHELL.barStart)
    expect(boxOf(all[3]).width).toBeCloseTo(ENTRY.x - ROOM.xMin)
    expect(all[3].position.z).toBe(ENTRY.postZ)
  })
})
