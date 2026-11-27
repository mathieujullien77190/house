import * as THREE from 'three'
import { CABINET, COLORS, COUNTER_TOP, ENTRY, KITCHEN, KITCHEN_BAYS, NICHES, PARTITION, PASSAGE, RECESS, ROOM, SALON_BAYS, SHELL, WORKTOP } from '@/components/Kitchen3D/constants'
import { box, standard, woodTexture } from '@/components/Kitchen3D/primitives'
import type { Area, Shell } from './walls'

/**
 * Les pièces de l'espace de vie, pour le sol et le plafond (pas le dehors, derrière l'entrée ou le mur de l'escalier) : le salon, la bande
 * entre le claustra et la cuisine, l'entrée, la cuisine.
 */
const LIVING_AREAS: Area[] = [
  [ROOM.xMin, ENTRY.x, ROOM.zMin, ROOM.zMax],
  [ENTRY.x, KITCHEN.xMin, ROOM.zMin, SHELL.entryBack],
  [ENTRY.x, ENTRY.northX, SHELL.entryBack, ENTRY.doorZ],
  [KITCHEN.xMin, KITCHEN.xMax, KITCHEN.zMin, KITCHEN.zMax],
]

/** Le sol de l'espace de vie : un fond sombre (ce qu'on voit dans les joints), sous les lames du parquet posées en fin de gros œuvre. */
export const livingFloors = ({ materials, slab, floors }: Shell): void => {
  for (const area of LIVING_AREAS) slab(materials.floor, -0.0005, true, area)
  floors.push(...LIVING_AREAS)
}

/** Les murs du salon (la télé à l'ouest, les baies au sud, le bureau à l'est jusqu'au mur de l'entrée) et ceux de la cuisine. */
export const livingWalls = ({ wall, pierced }: Shell): void => {
  const { xMin, xMax, zMin, zMax } = ROOM
  // Le mur de la télé, percé de la porte du couloir (ouverte) : un pan de chaque côté et le linteau au-dessus.
  wall('x', xMin, PASSAGE.from, zMin, 1)
  wall('x', PASSAGE.to, SHELL.salonX, zMin, 1)
  wall('x', PASSAGE.from, PASSAGE.to, zMin, 1, PASSAGE.top)
  pierced('z', zMin, zMax, xMin, 1, SALON_BAYS)
  wall('x', xMin, ENTRY.x, zMax, -1)
  // Les murs de la cuisine : la hotte (ouest, 30 cm plus à l'est que le mur de la télé) et les fenêtres (nord).
  wall('x', KITCHEN.xMin, KITCHEN.xMax, KITCHEN.zMin, 1)
  pierced('z', KITCHEN.zMin, KITCHEN.zMax, xMax, -1, KITCHEN_BAYS)
}

/** Le plafond : du lambris blanc (lames de 10 cm), et la plaque de plâtre lisse de la cuisine juste en dessous. */
export const livingCeiling = ({ group, materials, slab }: Shell): void => {
  const { height } = ROOM
  for (const area of LIVING_AREAS) slab(materials.lambris, height, false, area)
  const plaster = new THREE.Mesh(new THREE.PlaneGeometry(KITCHEN.xMax - KITCHEN.xMin, KITCHEN.zMax - KITCHEN.zMin), materials.plaster)
  plaster.rotation.x = Math.PI / 2
  plaster.position.set((KITCHEN.xMin + KITCHEN.xMax) / 2, height - 0.002, (KITCHEN.zMin + KITCHEN.zMax) / 2)
  group.add(plaster)
}

/**
 * Entre la cuisine et le salon : le mur plein (1,58 m), le bar (un muret, du lambris bleu côté salon, une tablette en bois qui dépasse côté
 * salon), l'ouverture, puis le retour de mur à droite du frigo.
 */
export const partition = (shell: Shell): void => {
  const { group, materials } = shell
  const { zMin, height } = ROOM
  const { wallX, salonX, barStart, returnStart, entryBack } = SHELL
  group.add(box(PARTITION.thickness, height, PARTITION.wall, materials.wall, wallX, height / 2, zMin + PARTITION.wall / 2))
  // Le lambris bleu du bar (2 cm) est pris dans l'épaisseur du muret : sa face est au nu du mur plein, côté salon, et la plinthe file droit.
  group.add(box(PARTITION.thickness - 0.02, PARTITION.height, PARTITION.bar, materials.wall, wallX + 0.01, PARTITION.height / 2, barStart + PARTITION.bar / 2))
  group.add(box(0.02, PARTITION.height, PARTITION.bar, materials.door, salonX + 0.01, PARTITION.height / 2, barStart + PARTITION.bar / 2))
  // La planche du bar (une seule, 29 cm) couvre le muret et le rebord, bute contre le mur plein et s'y prolonge par la bande qui dépasse ; côté cuisine, un rebord bas de 5 cm d'épaisseur longe tout le mur, du fond de la cuisine
  // au bout du bar, à la hauteur du bar : le plan de travail vient buter dessus. Devant le mur plein, il est coiffé d'une fine bande de bois.
  const ledgeX = KITCHEN.xMin + PARTITION.ledge
  // Ces planches courent le long de z : leur bois est tourné d'un quart de tour, pour que les veines suivent la longueur.
  const longGrain = woodTexture(COLORS.beam, 41)
  longGrain.center.set(0.5, 0.5)
  longGrain.rotation = Math.PI / 2
  const shelfLong = standard(longGrain, 0.6)
  const topFrom = salonX - 0.05
  group.add(box(ledgeX + 0.01 - topFrom, 0.04, PARTITION.bar + 0.04, shelfLong, (ledgeX + 0.01 + topFrom) / 2, PARTITION.height + 0.02, barStart + PARTITION.bar / 2 + 0.02))
  const ledgeEnd = barStart + PARTITION.bar
  group.add(box(PARTITION.ledge, PARTITION.height, ledgeEnd - KITCHEN.zMin, materials.wall, KITCHEN.xMin + PARTITION.ledge / 2, PARTITION.height / 2, (KITCHEN.zMin + ledgeEnd) / 2))
  group.add(box(PARTITION.ledge + 0.01, 0.04, barStart - KITCHEN.zMin, shelfLong, KITCHEN.xMin + (PARTITION.ledge + 0.01) / 2, PARTITION.height + 0.02, (KITCHEN.zMin + barStart) / 2))
  // Le bout du bar, vu de l'ouverture : fermé par du lambris bleu, sur l'épaisseur du muret (jusqu'à la tablette) puis sur le bout de la file de
  // caissons (jusque sous le plan de travail), avec une plinthe de chêne en bas.
  const barEnd = barStart + PARTITION.bar
  const runEnd = KITCHEN.xMin + PARTITION.ledge + CABINET.depth
  const underTop = COUNTER_TOP - WORKTOP.thickness
  group.add(box(PARTITION.thickness, PARTITION.height, 0.02, materials.door, wallX, PARTITION.height / 2, barEnd + 0.01))
  group.add(box(runEnd - KITCHEN.xMin, underTop, 0.02, materials.door, (runEnd + KITCHEN.xMin) / 2, underTop / 2, barEnd + 0.01))
  for (let line = 1; line < 8; line += 1) group.add(box(0.004, underTop - 0.1, 0.003, materials.carcass, salonX + ((runEnd - salonX) * line) / 8, underTop / 2 + 0.04, barEnd + 0.021))
  group.add(box(runEnd - salonX, 0.0796, 0.016, materials.beam, (runEnd + salonX) / 2, 0.0398, barEnd + 0.028))
  group.add(box(PARTITION.thickness, height, entryBack - returnStart, materials.wall, wallX, height / 2, (returnStart + entryBack) / 2))
}

/** Le mur de l’escalier, côté cuisine : des pans pleins entre les deux niches (le cellier, le comptoir à verres) et des linteaux au-dessus ; et son dos, fermé. */
export const stairWall = (shell: Shell): void => {
  const { group, materials, floors, skirting, wall, slab } = shell
  const { height } = ROOM
  const { salonX, shellBack } = SHELL
  let cursor = salonX
  for (const niche of [...NICHES].sort((a, b) => a.x - b.x)) {
    wall('x', cursor, niche.x - niche.width / 2, KITCHEN.zMax, -1)
    wall('x', niche.x - niche.width / 2, niche.x + niche.width / 2, KITCHEN.zMax, -1, niche.height)
    cursor = niche.x + niche.width / 2
    // L'intérieur de la niche : le fond, les deux joues et le plafond (le cellier est plus large que son ouverture).
    // Des pans lisibles de l'intérieur seulement : vus de dehors, rien ne dépasse derrière le mur.
    const back = KITCHEN.zMax + niche.depth
    wall('x', niche.x - niche.inner / 2, niche.x + niche.inner / 2, back, -1, niche.bottom, niche.height, false)
    wall('z', KITCHEN.zMax, back, niche.x - niche.inner / 2, 1, niche.bottom, niche.height, false)
    wall('z', KITCHEN.zMax, back, niche.x + niche.inner / 2, -1, niche.bottom, niche.height, false)
    if (niche.id === 'cellar') {
      // Le cellier est une petite pièce : du parquet au sol, des plinthes au fond et sur ses deux joues.
      const cellarFloor: Area = [niche.x - niche.inner / 2, niche.x + niche.inner / 2, KITCHEN.zMax, back]
      slab(materials.floor, -0.0005, true, cellarFloor)
      floors.push(cellarFloor)
      skirting('x', niche.x - niche.inner / 2, niche.x + niche.inner / 2, back, -1)
      skirting('z', KITCHEN.zMax, back, niche.x - niche.inner / 2, 1)
      skirting('z', KITCHEN.zMax, back, niche.x + niche.inner / 2, -1)
    }
    if (niche.bottom > 0) {
      // Sous la niche, le mur est plein, sauf le casier carré : quatre pans autour de son ouverture, et un creux en contreplaqué dont on ne
      // voit que l'intérieur.
      const left = niche.x - niche.width / 2
      const right = niche.x + niche.width / 2
      wall('x', left, right, KITCHEN.zMax, -1, 0, RECESS.bottom)
      wall('x', left, right, KITCHEN.zMax, -1, RECESS.top, niche.bottom)
      wall('x', left, niche.x - RECESS.width / 2, KITCHEN.zMax, -1, RECESS.bottom, RECESS.top)
      wall('x', niche.x + RECESS.width / 2, right, KITCHEN.zMax, -1, RECESS.bottom, RECESS.top)
      const plywood = standard(0xe2c9a0, 0.8)
      plywood.side = THREE.BackSide
      const hollow = new THREE.Mesh(new THREE.BoxGeometry(RECESS.width, RECESS.top - RECESS.bottom, RECESS.depth), plywood)
      hollow.position.set(niche.x, (RECESS.top + RECESS.bottom) / 2, KITCHEN.zMax + RECESS.depth / 2)
      group.add(hollow)
    }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(niche.inner, niche.depth), materials.wall)
    top.rotation.x = Math.PI / 2
    top.position.set(niche.x, niche.height, KITCHEN.zMax + niche.depth / 2)
    group.add(top)
  }
  wall('x', cursor, KITCHEN.xMax, KITCHEN.zMax, -1)
  // Le dos du mur de l'escalier : un bloc blanc fermé (le fond, les deux bouts, le dessus), lisible de dehors seulement. Vu de derrière ou
  // de dessus, on ne voit ni l'intérieur des niches ni le frigo ; vu de la cuisine, rien ne change.
  wall('x', ENTRY.northX, KITCHEN.xMax, shellBack, 1, 0, height, false)
  wall('z', KITCHEN.zMax, shellBack, KITCHEN.xMax, 1, 0, height, false)
  wall('z', KITCHEN.zMax, shellBack, ENTRY.northX, -1, 0, height, false)
  const shellTop = new THREE.Mesh(new THREE.PlaneGeometry(KITCHEN.xMax - ENTRY.northX, shellBack - KITCHEN.zMax), materials.wall)
  shellTop.rotation.x = -Math.PI / 2
  shellTop.position.set((KITCHEN.xMax + ENTRY.northX) / 2, height + 0.004, (KITCHEN.zMax + shellBack) / 2)
  group.add(shellTop)
}

/**
 * L'entrée : une petite pièce à l'est du passage. Son mur du fond (celui de la porte), son mur nord, le dos du mur du frigo, et le mur plein qui
 * prolonge le claustra jusqu'au mur du bureau (vu des deux côtés).
 */
export const entryWalls = (shell: Shell): void => {
  const { group, materials, wall } = shell
  const { zMax, height } = ROOM
  const { salonX, entryBack } = SHELL
  wall('x', ENTRY.x, ENTRY.northX, ENTRY.doorZ, -1)
  wall('z', entryBack, ENTRY.doorZ, ENTRY.northX, -1)
  wall('x', salonX, ENTRY.northX, entryBack, 1)
  group.add(box(0.12, height, zMax - ENTRY.wallZ, materials.wall, ENTRY.x, height / 2, (ENTRY.wallZ + zMax) / 2))
}

/**
 * Les plinthes des murs épais (des pavés, vus des deux côtés) : le mur plein et le bar côté salon, le retour de mur du frigo, le mur qui
 * prolonge le claustra et le muret du claustra.
 */
export const thickSkirtings = (shell: Shell): void => {
  const { skirting } = shell
  const { zMin, zMax } = ROOM
  const { salonX, barStart, returnStart, entryBack } = SHELL
  // Côté salon, une seule plinthe pour le mur plein et le bar (au même nu), jusqu'à celle du bout du bar : elles se rejoignent à l'angle.
  skirting('z', zMin, barStart + PARTITION.bar + 0.02, salonX, -1)
  skirting('z', returnStart, entryBack, salonX, -1)
  skirting('z', returnStart, KITCHEN.zMax, KITCHEN.xMin, 1)
  for (const side of [-1, 1] as const) {
    skirting('z', ENTRY.claustraZ, zMax, ENTRY.x + 0.06 * side, side)
  }
  // Et sur l'épaisseur des murs, là où ils s'arrêtent : le bout du retour de mur du frigo (vers l'ouverture), son autre bout dans l'entrée,
  // et le bout du muret du claustra.
  skirting('x', salonX, KITCHEN.xMin, returnStart, -1)
  skirting('x', ENTRY.x - 0.06, ENTRY.x + 0.06, ENTRY.claustraZ, -1)
}

/**
 * Les poutres de chêne (12 cm) : au-dessus du bar et de l'ouverture, du poteau au mur du claustra, celle d'un mètre qui les relie, et celle
 * qui coupe le salon en deux, du poteau au mur des baies.
 */
export const beams = (shell: Shell): void => {
  const { group, materials } = shell
  const { xMin, height } = ROOM
  const { wallX, barStart, returnStart } = SHELL
  const beamY = height - 0.06
  group.add(box(0.12, 0.12, returnStart - barStart, materials.beam, wallX, beamY, (barStart + returnStart) / 2))
  group.add(box(0.12, 0.12, ENTRY.wallZ - ENTRY.postZ, materials.beam, ENTRY.x, beamY, (ENTRY.postZ + ENTRY.wallZ) / 2))
  group.add(box(wallX - ENTRY.x, 0.12, 0.12, materials.beam, (wallX + ENTRY.x) / 2, beamY, ENTRY.postZ))
  group.add(box(ENTRY.x - xMin, 0.12, 0.12, materials.beam, (ENTRY.x + xMin) / 2, beamY, ENTRY.postZ))
}
