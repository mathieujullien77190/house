import * as THREE from 'three'
import { BASE, CAGE_CAMERA, GARDEN_CAMERA, INNER_CAGE_CAMERA, MAST, OUTER_WALL, REST, ROOM, SAS } from '@/components/Kitchen3D/constants'
import type { GardenMaterials } from '@/components/Kitchen3D/materials'
import { box, cylinder, standard, woodTexture } from '@/components/Kitchen3D/primitives'
import { reolink } from '@/components/Kitchen3D/reolink'
import { DECK, GRASS, HEDGE, PANEL, TERRACE } from './constants'
import { SITE } from './layout'
import { gardenX, gardenZ } from './plan'

/** Les quatre poubelles à roulettes, sur le pavage : une grise à couvercle marron, deux grises à couvercle jaune, une vert sombre. */
export const bins = (group: THREE.Group, m: GardenMaterials): void => {
  const { iron } = m
  const { binX, binEnd } = SITE
  const grey = standard(0x7f8388, 0.7)
  const colors: [number, number][] = [
    [0x7f8388, 0x7a5540],
    [0x7f8388, 0xe6cf3a],
    [0x7f8388, 0xe6cf3a],
    [0x2c3a33, 0x2c3a33],
  ]
  // En rang d'ouest en est, le dos au bord sud du pavage, poussées contre la haie de l'est.
  colors.forEach(([body, lid], index) => {
    const z = binEnd - index * 0.62
    group.add(box(0.56, 0.9, 0.5, body === 0x7f8388 ? grey : standard(body, 0.7), binX, 0.55, z), box(0.62, 0.06, 0.54, standard(lid, 0.6), binX + 0.02, 1.03, z))
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 14), iron)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(binX - 0.22, 0.09, z + side * 0.23)
      group.add(wheel)
    }
  })
}

/** Sur la pelouse, la table de jardin blanche et ses quatre chaises. */
export const gardenTable = (group: THREE.Group): void => {
  const { house } = SITE
  const plastic = standard(0xf2f2ee, 0.6)
  // Décalée d'1,50 m vers le prunus (vers l'est, un rien vers la maison).
  // Puis d'un mètre vers le cerisier (vers le nord et l'ouest : 65 cm et 76 cm).
  const tableX = house[0] - TERRACE - 4 + 0.35 + 0.65
  const tableZ = REST.west + 1.5 + 1.45 - 0.76
  const top = cylinder(0.55, 0.55, 0.04, plastic, tableX, 0.72, tableZ, 28)
  top.scale.z = 1.5
  group.add(top)
  for (const [dx, dz] of [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]]) group.add(box(0.04, 0.7, 0.04, plastic, tableX + dx, 0.35, tableZ + dz))
  for (const [dx, dz, turn] of [[0, -1.2, 0], [0, 1.2, Math.PI], [-0.9, 0, Math.PI / 2], [0.9, 0, -Math.PI / 2]]) {
    const chair = new THREE.Group()
    chair.position.set(tableX + dx, 0, tableZ + dz)
    chair.rotation.y = turn
    chair.add(box(0.48, 0.04, 0.46, plastic, 0, 0.42, 0), box(0.48, 0.5, 0.04, plastic, 0, 0.68, -0.23))
    for (const side of [-1, 1]) chair.add(box(0.04, 0.42, 0.04, plastic, side * 0.21, 0.21, 0.2), box(0.04, 0.42, 0.04, plastic, side * 0.21, 0.21, -0.2), box(0.04, 0.03, 0.44, plastic, side * 0.24, 0.6, 0))
    group.add(chair)
  }
}

/**
 * Le groupe extérieur de la pompe à chaleur : un caisson blanc sur deux plots noirs, sa grille ronde en façade, posé sur une dalle de
 * béton dans l'angle que font le sas et le mur de l'escalier.
 */
export const heatPump = (group: THREE.Group, m: GardenMaterials): void => {
  const { concrete, iron } = m
  const { house } = SITE
  const pumpX = SAS.north + OUTER_WALL + 1.25
  const pumpZ = ROOM.zMax + OUTER_WALL + 0.3
  // La dalle court le long de la façade, du mur du sas jusqu'au bout de la maison.
  const slabFrom = SAS.north + OUTER_WALL - 0.05
  // Elle ne dépasse pas de la maison : elle s'arrête au nu des murets de soubassement (en retrait des murs), au nord comme à l'est.
  const slabNorth = house[1] - BASE.setback
  const slabWest = house[3] - BASE.setback - 0.03
  const slabEast = SAS.east + OUTER_WALL - BASE.setback
  group.add(box(slabNorth - slabFrom, 0.14, slabEast - slabWest, concrete, (slabNorth + slabFrom) / 2, 0.05, (slabEast + slabWest) / 2))
  group.add(box(0.85, 0.6, 0.33, standard(0xf0f0ee, 0.5), pumpX, 0.5, pumpZ))
  for (const side of [-1, 1]) group.add(box(0.1, 0.08, 0.4, iron, pumpX + side * 0.28, 0.16, pumpZ))
  const grille = cylinder(0.24, 0.24, 0.012, standard(0x9da1a6, 0.5, 0.4), pumpX - 0.1, 0.5, pumpZ + 0.17, 28)
  grille.rotation.x = Math.PI / 2
  group.add(grille)
}

/**
 * Devant le long bac, une terrasse en ipé (un bois brun sombre), surélevée : des lattes de 3 m, en travers du sens des bacs, à 1 cm
 * l'une de l'autre, et une planche de rive qui en fait le tour. Elle contourne le pied du laurier : un
 * carré y est laissé ouvert, bordé de bois plus haut que les lattes, comme un bac où l'arbre serait planté.
 */
export const deck = (group: THREE.Group, m: GardenMaterials): void => {
  const { post, soil } = m
  const { stepLine, cageZ1, treeX, treeZ } = SITE
  const slat = { long: DECK.long, wide: 0.14, gap: 0.01, thick: DECK.thick }
  const ipeWood = standard(woodTexture(0x9a6f4e, 151), 0.7)
  // Elle recouvre toute l'herbe à droite et à gauche du bac : de la bande de béton derrière la maison jusqu'à la haie du fond.
  const deckFrom = stepLine + TERRACE + BASE.setback + 0.03
  const deckEnd = gardenX(HEDGE.north) - HEDGE.thickness / 2 - 0.005
  const deckNear = cageZ1 - 0.4
  const deckFar = deckNear - slat.long
  const deckTop = DECK.top
  // Au pied de la haie du fond, une bande de béton de 30 cm la longe, de la terrasse en ipé jusqu'à la haie de l'ouest : elle dépasse l'herbe de 5 cm.
  const stripWest = gardenZ(HEDGE.west) + HEDGE.thickness / 2
  group.add(box(0.3, 0.1, deckFar - stripWest, m.concrete, deckEnd + 0.005 - 0.15, GRASS, (deckFar + stripWest) / 2))
  const pot = 0.5
  const count = Math.round((deckEnd - deckFrom + slat.gap) / (slat.wide + slat.gap))
  // Les lattes sont ajustées pour que la dernière touche la haie.
  slat.wide = (deckEnd - deckFrom + slat.gap) / count - slat.gap
  const deckTo = deckFrom + count * (slat.wide + slat.gap) - slat.gap
  // Chaque latte : d'un bout à l'autre, ou en deux morceaux de part et d'autre du carré de l'arbre.
  const pieces: [number, number, number][] = []
  for (let index = 0; index < count; index += 1) {
    const x = deckFrom + slat.wide / 2 + index * (slat.wide + slat.gap)
    if (Math.abs(x - treeX) < pot + slat.wide / 2) pieces.push([x, deckNear, treeZ + pot], [x, treeZ - pot, deckFar])
    else pieces.push([x, deckNear, deckFar])
  }
  const ipe = new THREE.InstancedMesh(new THREE.BoxGeometry(slat.wide, slat.thick, 1), ipeWood, pieces.length)
  const placed = new THREE.Object3D()
  pieces.forEach(([x, from, to], index) => {
    placed.position.set(x, deckTop - slat.thick / 2, (from + to) / 2)
    placed.scale.set(1, 1, from - to)
    placed.updateMatrix()
    ipe.setMatrixAt(index, placed.matrix)
  })
  group.add(ipe)
  // La planche de rive, du sol au dessus des lattes, sur les quatre côtés.
  const rimTall = deckTop - GRASS
  const rimY = deckTop - rimTall / 2
  const deckMiddleX = (deckFrom + deckTo) / 2
  const deckMiddleZ = (deckNear + deckFar) / 2
  for (const z of [deckNear + 0.0125, deckFar - 0.0125]) group.add(box(deckTo - deckFrom + 0.05, rimTall, 0.025, ipeWood, deckMiddleX, rimY, z))
  for (const x of [deckFrom - 0.0125, deckTo + 0.0125]) group.add(box(0.025, rimTall, slat.long, ipeWood, x, rimY, deckMiddleZ))
  // Le bac de l'arbre : quatre planches de douglas (le bois clair de la cage) autour du carré, 15 cm plus hautes que la terrasse, et de la terre dedans.
  const potTall = rimTall + 0.15
  const potY = deckTop + 0.15 - potTall / 2
  for (const side of [-1, 1]) group.add(box(pot * 2 + 0.06, potTall, 0.03, post, treeX, potY, treeZ + side * (pot + 0.015)), box(0.03, potTall, pot * 2, post, treeX + side * (pot + 0.015), potY, treeZ))
  group.add(box(pot * 2, 0.02, pot * 2, soil, treeX, deckTop + 0.08, treeZ))
}

/**
 * La ligne électrique : un poteau de bois dans la rue (au-delà de l'arc de la haie, vers le portillon), et le câble qui en part, pend un
 * peu, et arrive au sommet du poteau d'acier du sas.
 */
export const powerLine = (group: THREE.Group): void => {
  const pole = { x: gardenX(880), z: gardenZ(600), tall: 7.5 }
  const wood = standard(woodTexture(0x6b4f3a, 173), 0.95)
  group.add(cylinder(0.09, 0.13, pole.tall, wood, pole.x, pole.tall / 2, pole.z, 10), box(0.08, 0.08, 1, wood, pole.x, pole.tall - 0.35, pole.z))
  const from = new THREE.Vector3(pole.x, pole.tall - 0.3, pole.z)
  // Le sommet du poteau d'acier, dans le repère du jardin (plus bas que le sol de la maison).
  const to = new THREE.Vector3(MAST.x, MAST.from + MAST.tall + BASE.rise, MAST.z)
  const sag = 0.9
  const points = Array.from({ length: 17 }, (_, index) => {
    const share = index / 16
    return from.clone().lerp(to, share).setY(from.y + (to.y - from.y) * share - sag * 4 * share * (1 - share))
  })
  group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.012, 5), standard(0x1c1d20, 0.8)))
}

/**
 * Les caméras de la cage, à son coin du fond du côté du grand arbre (le bout nord du grand côté grillagé), dehors, à 1 m du sol, une
 * Reolink regarde le jardin (la terrasse en ipé, la pelouse) ; juste derrière elle, dans la cage (à 50 cm du sol), une autre regarde vers les poubelles, à
 * travers la cage.
 */
export const gardenCamera = (group: THREE.Group): void => {
  const { cageX2, cageZ1, treeX, binX, binEnd } = SITE
  group.add(reolink(new THREE.Vector3(cageX2 - 0.08, GRASS + 1, cageZ1 - 0.06), new THREE.Vector3(treeX - 1, GRASS + 0.4, cageZ1 - 5), GARDEN_CAMERA))
  group.add(reolink(new THREE.Vector3(cageX2 - 0.2, 0.5, cageZ1 + 0.14 + PANEL), new THREE.Vector3(binX, 0.6, binEnd - 1), CAGE_CAMERA))
  // Dans la cage, sur le pan de bois plein à côté de la porte intérieure, à 70 cm du sol : elle regarde droit devant elle, vers le fond de la cage.
  group.add(reolink(new THREE.Vector3(SITE.backX + 0.08, 0.7, SITE.cageZ2 - PANEL / 2), new THREE.Vector3(cageX2, 0.7, SITE.cageZ2 - PANEL / 2), INNER_CAGE_CAMERA))
}

/**
 * Une poubelle grise renversée dans le petit coin de terre derrière la cage, au fond : la même que les poubelles à roulettes, sans son
 * couvercle et un cinquième plus grosse, retournée (son ouverture contre la terre, ses deux roulettes en l'air).
 */
export const upturnedBin = (group: THREE.Group, m: GardenMaterials, at: THREE.Vector3): void => {
  const bin = new THREE.Group()
  const [wide, tall, deep] = [0.68, 1.08, 0.6]
  bin.add(box(wide, tall, deep, standard(0x7f8388, 0.7), 0, tall / 2, 0))
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.045, 14), m.iron)
    wheel.rotation.x = Math.PI / 2
    wheel.position.set(wide / 2 - 0.05, tall - 0.1, side * (deep / 2 - 0.05))
    bin.add(wheel)
  }
  bin.position.copy(at)
  group.add(bin)
}
