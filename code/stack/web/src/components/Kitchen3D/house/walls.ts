import * as THREE from 'three'
import { PASSAGE, ROOM } from '@/components/Kitchen3D/constants'
import type { KitchenMaps, KitchenMaterials } from '@/components/Kitchen3D/materials'
import { box } from '@/components/Kitchen3D/primitives'
import { parquet, SMALL_PLANK } from './parquet'

/** Un rectangle au sol : [x1, x2, z1, z2]. */
export type Area = [number, number, number, number]
/** Un passage de porte dans un mur : de où à où, le long du mur. */
export type Gap = [number, number]
/** Une ouverture en hauteur (fenêtre, alcôve) : son milieu le long du mur, sa largeur, son bas, sa hauteur. */
export interface Bay {
  z: number
  width: number
  bottom: number
  height: number
}

/** Un pan de mur blanc dans un plan vertical, lisible d'un seul côté. `axis` : le mur court le long de x ou de z ; `facing` : le sens de sa face visible sur l'autre axe. */
const wallPane = (material: THREE.Material, axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1, bottom: number, top: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(to - from, top - bottom), material)
  const middle = (from + to) / 2
  if (axis === 'x') {
    mesh.rotation.y = facing === 1 ? 0 : Math.PI
    mesh.position.set(middle, (bottom + top) / 2, at)
  } else {
    mesh.rotation.y = (Math.PI / 2) * facing
    mesh.position.set(at, (bottom + top) / 2, middle)
  }
  return mesh
}

/**
 * Les outils du gros œuvre, qui ajoutent à `group` : plinthe, pan de mur, dalle (sol ou plafond), mur percé de baies ou de portes, mur
 * épais plein, pièce vide. Les pans sont lisibles de l'intérieur seulement.
 */
export const wallKit = (group: THREE.Group, materials: KitchenMaterials) => {
  const { height } = ROOM
  // Une plinthe de chêne (8 cm) au pied d'un mur : le long de x ou de z, plaquée du côté `facing`. Aux angles, c'est la plinthe le long de z
  // qui recouvre l'autre : elle dépasse de son épaisseur à chaque bout (dans un angle rentrant, ce bout est caché dans le mur). Celle le long
  // de x est un cheveu plus basse, pour que leurs dessus ne soient jamais au même endroit.
  const skirting = (axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1) => {
    const thick = 0.016
    const length = to - from
    const middle = (from + to) / 2
    group.add(axis === 'x' ? box(length, 0.0796, thick, materials.beam, middle, 0.0398, at + (thick / 2) * facing) : box(thick, 0.08, length + thick * 2, materials.beam, at + (thick / 2) * facing, 0.04, middle))
  }
  // Un pan de mur blanc ; s'il part du sol, il a sa plinthe (sauf `skirt` à faux : l'intérieur d'une niche).
  const wall = (axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1, bottom = 0, top = height, skirt = true) => {
    group.add(wallPane(materials.wall, axis, from, to, at, facing, bottom, top))
    if (skirt && bottom === 0) skirting(axis, from, to, at, facing)
  }
  // Une dalle à plat (sol tourné vers le haut, ou plafond) : sa texture est posée aux cotes de la scène (un motif par mètre), pour que
  // les lames se suivent d'une dalle à l'autre.
  const slab = (material: THREE.Material, y: number, up: boolean, [x1, x2, z1, z2]: Area) => {
    const geometry = new THREE.PlaneGeometry(x2 - x1, z2 - z1)
    const position = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    const middleX = (x1 + x2) / 2
    const middleZ = (z1 + z2) / 2
    for (let index = 0; index < position.count; index += 1) uv.setXY(index, middleX + position.getX(index), middleZ + position.getY(index))
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = up ? -Math.PI / 2 : Math.PI / 2
    mesh.position.set(middleX, y, middleZ)
    group.add(mesh)
  }
  // Un mur percé de fenêtres : des pans autour de chaque baie (du sol à l'allège, du linteau au plafond), pour qu'on voie dehors à travers
  // la vitre. Chaque baie est donnée par son milieu, sa largeur, son bas et sa hauteur.
  const pierced = (axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1, bays: Bay[]) => {
    let cursor = from
    for (const bay of [...bays].sort((a, b) => a.z - b.z)) {
      const start = bay.z - bay.width / 2
      const end = bay.z + bay.width / 2
      wall(axis, cursor, start, at, facing, 0, height, false)
      wall(axis, start, end, at, facing, 0, bay.bottom, false)
      wall(axis, start, end, at, facing, bay.bottom + bay.height, height, false)
      cursor = end
    }
    wall(axis, cursor, to, at, facing, 0, height, false)
    skirting(axis, from, to, at, facing)
  }
  // Un pan de mur percé de passages de porte (jusqu'à la hauteur de la porte du couloir, donnés dans l'ordre le long du mur), avec son linteau au-dessus de chacun.
  const gapped = (axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1, gaps: Gap[] = []) => {
    let cursor = from
    for (const [start, end] of gaps) {
      wall(axis, cursor, start, at, facing)
      wall(axis, start, end, at, facing, PASSAGE.top)
      cursor = end
    }
    wall(axis, cursor, to, at, facing)
  }
  // Un mur épais plein (vu des deux côtés), le long de `axis`, entre `low` et `high` en travers ; percé des mêmes passages, il garde
  // son linteau au-dessus et reçoit un seuil au sol.
  const solid = (axis: 'x' | 'z', from: number, to: number, low: number, high: number, gaps: Gap[], threshold: THREE.Material) => {
    const across = (low + high) / 2
    const thick = high - low - 0.002
    const piece = (start: number, end: number, bottom: number, top: number, material: THREE.Material) => {
      const tall = top - bottom
      group.add(axis === 'x' ? box(end - start, tall, thick, material, (start + end) / 2, bottom + tall / 2, across) : box(thick, tall, end - start, material, across, bottom + tall / 2, (start + end) / 2))
    }
    let cursor = from
    for (const [start, end] of gaps) {
      piece(cursor, start, 0, height, materials.wall)
      piece(start, end, PASSAGE.top, height, materials.wall)
      piece(start, end, -0.01, 0, threshold)
      cursor = end
    }
    piece(cursor, to, 0, height, materials.wall)
  }
  // Une pièce vide : ses quatre murs (west et east : ceux de z1 et z2 ; south et north : ceux de x1 et x2), percés de leurs portes.
  const emptyRoom = ([x1, x2, z1, z2]: Area, floor: THREE.Material | 'small', doors: { west?: Gap[]; east?: Gap[]; south?: Gap[]; north?: Gap[] } = {}, bays: { west?: Bay[]; east?: Bay[]; south?: Bay[]; north?: Bay[] } = {}) => {
    // Les murs ouest et est peuvent être percés d'ouvertures en hauteur (une fenêtre, une alcôve) au lieu de portes.
    if (bays.west) pierced('x', x1, x2, z1, 1, bays.west)
    else gapped('x', x1, x2, z1, 1, doors.west)
    if (bays.east) pierced('x', x1, x2, z2, -1, bays.east)
    else gapped('x', x1, x2, z2, -1, doors.east)
    if (bays.south) pierced('z', z1, z2, x1, 1, bays.south)
    else gapped('z', z1, z2, x1, 1, doors.south)
    if (bays.north) pierced('z', z1, z2, x2, -1, bays.north)
    else gapped('z', z1, z2, x2, -1, doors.north)
    slab(materials.lambris, height, false, [x1, x2, z1, z2])
    if (floor === 'small') {
      slab(materials.floor, -0.0005, true, [x1, x2, z1, z2])
      // Le même parquet qu'au salon (même pose au tiers), en lames plus petites, tournées d'un quart de tour.
      group.add(parquet([[x1, x2, z1, z2]], SMALL_PLANK, true))
    } else slab(floor, 0, true, [x1, x2, z1, z2])
  }
  return { skirting, wall, slab, pierced, gapped, solid, emptyRoom }
}

type WallKit = ReturnType<typeof wallKit>

/** Ce que partagent les constructeurs du gros œuvre : le groupe où ils ajoutent, les matériaux, les sols à parqueter (chacun y inscrit les siens), le chêne clair des seuils, et les outils de `wallKit`. */
export interface Shell extends WallKit {
  group: THREE.Group
  materials: KitchenMaterials
  maps: KitchenMaps
  floors: Area[]
  sill: THREE.Material
}
