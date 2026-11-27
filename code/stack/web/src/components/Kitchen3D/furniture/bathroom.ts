import * as THREE from 'three'
import { BATH_WINDOW, REST, ROOM, WC_ALCOVE } from '@/components/Kitchen3D/constants'
import { mirrorGlass } from '@/components/Kitchen3D/materials'
import type { RoomMaterials } from '@/components/Kitchen3D/materials'
import { box, bulbBall, cylinder, fixtureBulb, standard } from '@/components/Kitchen3D/primitives'
import { photoTexture, showerTilesTexture } from '@/components/Kitchen3D/textures'

// La pièce : ses quatre murs et son plafond.
const north = ROOM.xMax
const south = REST.bathSouth
const west = REST.bathWest
const east = ROOM.zMin
const height = ROOM.height
// Les WC, dans le coin sud-est : fermés au nord par une cloison, ouverts à l'ouest.
const wcNorth = south + 1.0
const wcWest = east - 0.9
// Le receveur de la douche, mesuré : 90 cm de large (depuis le mur est) sur 1,10 m de long (depuis la cloison des WC).
const trayDeep = 0.9
const trayLong = 1.1
const trayNorth = wcNorth + 0.035 + trayLong
const trayX = (trayNorth + wcNorth + 0.035) / 2
// Le meuble de la vasque, entre la douche et le mur nord.
const vanityX = (trayNorth + north) / 2

/** Le plafond et les murs : les spots de l’allée et de la douche, le mur ouest vert sur lambris blanc (porte-serviette, étagère haute), la fenêtre dépolie du mur nord. */
const bathWalls = (group: THREE.Group, m: RoomMaterials): void => {
  const middleX = (north + south) / 2
  // Les spots encastrés du plafond : un par lampe Hue de la pièce (les deux du lavabo sont plus bas) : une
  // collerette chromée et l'ampoule.
  // Trois en ligne dans l'allée, de la fenêtre à la porte (« SdB 1 », « SdB 4 », « SdB 3 », comme sur le plan de la maison), et un au-dessus
  // de la douche (« SdB 5 »).
  const aisleZ = west + 0.56
  const spots: [string, number, number][] = [
    ['sdb 1', north - 0.5, aisleZ],
    ['sdb 4', (north + south) / 2, aisleZ],
    ['sdb 3', south + 0.5, aisleZ],
    ['sdb 5', south + 1.585, east - 0.45],
  ]
  for (const [name, x, z] of spots) {
    group.add(cylinder(0.05, 0.05, 0.012, m.chrome, x, height - 0.006, z, 20), fixtureBulb(bulbBall(0.03, x, height - 0.02, z), name))
  }
  // Le mur ouest : lambris blanc jusqu'à 1 m, cimaise de chêne, vert au-dessus ; le porte-serviette et sa serviette jaune ; l'étagère haute.
  group.add(box(north - south, height - 1, 0.008, m.green, middleX, (height + 1) / 2, west + 0.004), box(north - south, 0.05, 0.02, m.oak, middleX, 1, west + 0.01))
  group.add(box(0.5, 0.02, 0.06, m.black, 0.2, 0.86, west + 0.04), box(0.36, 0.5, 0.02, standard(0xd9b81e, 0.95), 0.2, 0.62, west + 0.06))
  // L'étagère haute : une planche de pin clair, d'un bout à l'autre du mur, sur des équerres noires.
  group.add(box(north - south, 0.03, 0.22, m.pine, middleX, 2.02, west + 0.11))
  for (let bracket = 0; bracket < 4; bracket += 1) group.add(box(0.02, 0.1, 0.012, m.black, south + 0.3 + bracket * ((north - south - 0.6) / 3), 1.96, west + 0.012), box(0.02, 0.012, 0.18, m.black, south + 0.3 + bracket * ((north - south - 0.6) / 3), 2.0, west + 0.1))
  // Le mur nord : la fenêtre dépolie à deux vantaux dans son cadre de chêne, et des lames blanches horizontales dessous.
  // Elle prend tout le mur, à 5 cm de chaque bout, et le traverse (le mur est percé, `house/rest.ts`) : un habillage de chêne autour de
  // l'ouverture, côté pièce, et dans l'épaisseur du mur un cadre blanc à deux vantaux aux vitres dépolies, qui laissent passer le jour.
  const windowZ = BATH_WINDOW.z
  const windowWide = BATH_WINDOW.width
  const windowY = BATH_WINDOW.bottom + BATH_WINDOW.height / 2
  const frostedGlass = new THREE.MeshStandardMaterial({ color: 0xe6f1f4, roughness: 0.9, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  for (const side of [-1, 1]) {
    group.add(box(0.02, 0.03, windowWide + 0.06, m.oak, north - 0.01, windowY + side * (BATH_WINDOW.height / 2 + 0.015), windowZ), box(0.02, BATH_WINDOW.height, 0.03, m.oak, north - 0.01, windowY, windowZ + side * (windowWide / 2 + 0.015)))
    group.add(box(0.06, 0.05, windowWide, m.white, north + 0.1, windowY + side * (BATH_WINDOW.height / 2 - 0.025), windowZ), box(0.06, BATH_WINDOW.height, 0.05, m.white, north + 0.1, windowY, windowZ + side * (windowWide / 2 - 0.025)))
    group.add(box(0.008, BATH_WINDOW.height - 0.1, windowWide / 2 - 0.08, frostedGlass, north + 0.1, windowY, windowZ + side * (windowWide / 4 - 0.01)))
  }
  group.add(box(0.06, BATH_WINDOW.height, 0.07, m.white, north + 0.1, windowY, windowZ))
  for (let line = 1; line < 7; line += 1) group.add(box(0.003, 0.003, east - west, m.line, north - 0.002, line * 0.18, (east + west) / 2))
}

/** Les WC derrière leur cloison (carrelée côté douche) : cuvette suspendue, plaque noire, alcôve, balai, cadres, rouleaux. */
const toilet = (group: THREE.Group, m: RoomMaterials): void => {
  group.add(box(0.07, height, east - wcWest, m.white, wcNorth, height / 2, (east + wcWest) / 2))
  const bowlX = WC_ALCOVE.x
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), m.white)
  bowl.scale.set(0.9, 0.75, 1.3)
  bowl.position.set(bowlX, 0.3, east - 0.3)
  const lid = box(0.36, 0.44, 0.03, m.white, bowlX, 0.62, east - 0.05)
  lid.rotation.x = -0.12
  group.add(bowl, lid, box(0.22, 0.16, 0.012, m.black, bowlX, 1.05, east - 0.006))
  // L'alcôve au-dessus : un creux dans le mur épais (le mur de la pièce est percé, `house/rest.ts`), du même blanc que le mur, avec sa
  // tablette de chêne qui dépasse, une figurine sombre et un rouleau.
  const alcoveY = WC_ALCOVE.bottom + WC_ALCOVE.height / 2
  const hollow = new THREE.Mesh(new THREE.BoxGeometry(WC_ALCOVE.width, WC_ALCOVE.height, WC_ALCOVE.depth), new THREE.MeshStandardMaterial({ color: 0xf4f4f1, roughness: 0.6, side: THREE.BackSide }))
  hollow.position.set(bowlX, alcoveY, east + WC_ALCOVE.depth / 2)
  group.add(hollow)
  group.add(box(WC_ALCOVE.width + 0.06, 0.025, WC_ALCOVE.depth + 0.04, m.oak, bowlX, WC_ALCOVE.bottom + 0.0125, east + WC_ALCOVE.depth / 2 - 0.02))
  group.add(box(0.14, 0.07, 0.05, standard(0x5a4636, 0.9), bowlX - 0.05, WC_ALCOVE.bottom + 0.06, east + 0.07), cylinder(0.035, 0.035, 0.08, m.cream, bowlX + 0.1, WC_ALCOVE.bottom + 0.065, east + 0.07, 14))
  // Le balai des WC : un pot carré noir et son manche, posé à droite de la cuvette pour qui la regarde (côté sud).
  group.add(box(0.1, 0.32, 0.1, m.black, bowlX - 0.32, 0.16, east - 0.1), box(0.02, 0.12, 0.02, m.black, bowlX - 0.32, 0.38, east - 0.1))
  // Les cadres, sur la cloison, et les rouleaux posés sur un coffre bas à gauche de la cuvette.
  // Chaque cadre : une baguette d'acacia, un fond blanc et sa gravure (une photo du vrai cadre). `facing` : +1 s'il regarde vers le nord.
  const framed = (name: string, x: number, facing: 1 | -1, z: number, y: number, wide: number, tall: number) => {
    const map = photoTexture(`${name}.jpg`)
    const image = new THREE.Mesh(new THREE.PlaneGeometry(wide - 0.06, tall - 0.06), new THREE.MeshStandardMaterial({ map, roughness: 0.7 }))
    image.rotation.y = (Math.PI / 2) * facing
    image.position.set(x + facing * 0.024, y, z)
    group.add(box(0.02, tall, wide, m.acacia, x + facing * 0.01, y, z), box(0.004, tall - 0.06, wide - 0.06, m.white, x + facing * 0.021, y, z), image)
  }
  // Sur la cloison (à gauche pour qui regarde la cuvette) : les flamants au trait, les jaseurs dans leur grand cadre, le petit oiseau à l'encre.
  framed('wc-flamingo', wcNorth - 0.035, -1, east - 0.55, 1.95, 0.3, 0.2)
  framed('wc-waxwing', wcNorth - 0.035, -1, east - 0.5, 1.5, 0.4, 0.55)
  framed('wc-ink', wcNorth - 0.035, -1, east - 0.3, 1.05, 0.16, 0.22)
  // Sur le mur d'en face (à droite) : les herbes au papillon, plus haut et côté cuvette, puis le hibou grand-duc, plus bas, vers la porte.
  framed('wc-plants', south, 1, east - 0.32, 1.62, 0.36, 0.44)
  framed('wc-owl', south, 1, east - 0.66, 1.4, 0.26, 0.32)
  group.add(box(0.14, 0.3, 0.3, m.white, wcNorth - 0.11, 0.15, east - 0.15), box(0.15, 0.02, 0.32, m.oak, wcNorth - 0.11, 0.31, east - 0.15))
  for (const dz of [0.06, 0.16, 0.26]) group.add(cylinder(0.05, 0.05, 0.1, m.cream, wcNorth - 0.11, 0.37, east - dz, 14))
}

/** La douche, au nord des WC, le long du mur est : receveur blanc, carrelage sur le mur est et sur la cloison, paroi de verre, colonne. */
const shower = (group: THREE.Group, m: RoomMaterials): void => {
  group.add(box(trayLong, 0.04, trayDeep, standard(0xd0d2d3, 0.6), trayX, 0.02, east - trayDeep / 2), box(0.1, 0.004, 0.1, standard(0x5a4636, 0.5, 0.5), trayX, 0.042, east - trayDeep / 2))
  // Des carreaux carrés de 15 cm : l'image en porte seize de côté, chaque pan n'en montre que ce qui tient dans sa largeur et sa hauteur.
  const tileSize = 0.15
  const tileMap = showerTilesTexture()
  const tiled = (wide: number, tall: number): THREE.MeshStandardMaterial => {
    const map = tileMap.clone()
    map.repeat.set(wide / (16 * tileSize), tall / (16 * tileSize))
    map.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map, roughness: 0.35 })
  }
  // Le carrelage ne couvre que la douche (pas de crédence au-dessus du lavabo), et passe devant la plinthe du mur : pas de plinthe dans la douche.
  const wallTiles = new THREE.Mesh(new THREE.PlaneGeometry(trayNorth - wcNorth, 2.2), tiled(trayNorth - wcNorth, 2.2))
  wallTiles.rotation.y = Math.PI
  wallTiles.position.set((trayNorth + wcNorth) / 2, 1.1, east - 0.018)
  const sideTiles = new THREE.Mesh(new THREE.PlaneGeometry(trayDeep, 2.2), tiled(trayDeep, 2.2))
  sideTiles.rotation.y = Math.PI / 2
  sideTiles.position.set(wcNorth + 0.039, 1.1, east - trayDeep / 2)
  group.add(wallTiles, sideTiles)
  // La paroi de verre, entre la douche et le lavabo : d'équerre au mur, sur toute la largeur du receveur, tenue en haut par une barre
  // chromée qui file jusqu'à la cloison des WC.
  const showerGlass = new THREE.MeshStandardMaterial({ color: 0xcfe3e0, roughness: 0.05, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
  group.add(box(0.01, 2.0, trayDeep, showerGlass, trayNorth, 1.0, east - trayDeep / 2), box(trayLong, 0.03, 0.03, m.chrome, trayX, 2.0, east - trayDeep + 0.02))
  group.add(cylinder(0.012, 0.012, 1.3, m.chrome, trayX - 0.1, 1.45, east - 0.05, 10), box(0.03, 0.03, 0.3, m.chrome, trayX - 0.1, 2.1, east - 0.18), cylinder(0.11, 0.05, 0.05, m.chrome, trayX - 0.1, 2.06, east - 0.33, 20))
  group.add(box(0.16, 0.05, 0.06, m.chrome, trayX - 0.1, 1.05, east - 0.07))
}

/**
 * Le meuble de la vasque, tourné d'un quart de tour : adossé au mur est, entre la douche et le mur nord. Bois, vasque de pierre, robinet,
 * miroir encadré de bois et sa tablette ; et ses deux spots.
 */
const vanity = (group: THREE.Group, m: RoomMaterials): void => {
  const vanityZ = east - 0.24
  group.add(box(0.56, 0.82, 0.45, m.acacia, vanityX, 0.41, vanityZ), box(0.42, 0.12, 0.4, m.stone, vanityX, 0.86, vanityZ - 0.01))
  group.add(box(0.03, 0.12, 0.03, m.chrome, vanityX, 0.95, east - 0.08), box(0.03, 0.02, 0.12, m.chrome, vanityX, 1.0, east - 0.13))
  group.add(box(0.5, 0.62, 0.03, m.acacia, vanityX, 1.55, east - 0.015), box(0.38, 0.5, 0.005, mirrorGlass(), vanityX, 1.58, east - 0.032), box(0.5, 0.02, 0.1, m.acacia, vanityX, 1.22, east - 0.05))
  // Les deux spots du lavabo (« SdB 6 » et « SdB 7 ») : au plafond, côte à côte, juste devant le miroir.
  for (const [name, side] of [['sdb 6', -1], ['sdb 7', 1]] as [string, number][]) {
    const spotX = vanityX + side * 0.22
    group.add(cylinder(0.05, 0.05, 0.012, m.chrome, spotX, height - 0.006, east - 0.35, 20), fixtureBulb(bulbBall(0.03, spotX, height - 0.02, east - 0.35), name))
  }
}

/** Le montant de chêne au bout de la cloison ; le tapis crème devant la douche et le tapis vert devant le lavabo. */
const bathRugs = (group: THREE.Group, m: RoomMaterials): void => {
  group.add(box(0.08, 2.1, 0.05, m.oak, wcNorth, 1.05, wcWest - 0.025))
  group.add(box(0.95, 0.02, 0.5, m.cream, trayX, 0.012, east - trayDeep - 0.3), box(0.6, 0.015, 0.45, standard(0x8f9f7c, 0.95), vanityX, 0.01, east - 0.75))
}

/**
 * La salle de bain : le mur ouest vert au-dessus d'un lambris blanc à cimaise de chêne (porte-serviette, étagère haute), la fenêtre dépolie
 * du mur nord, le meuble de bois à vasque de pierre et son miroir, la douche dans l'angle (receveur blanc, carrelage vert sur deux murs,
 * paroi de verre, colonne chromée), les deux tapis ; et, dans le coin sud-est, les WC derrière leur cloison : cuvette suspendue, plaque
 * noire, niche éclairée, cadres, porte coulissante à moitié ouverte.
 */
export const bathroom = (m: RoomMaterials): THREE.Group => {
  const group = new THREE.Group()
  bathWalls(group, m)
  toilet(group, m)
  shower(group, m)
  vanity(group, m)
  bathRugs(group, m)
  return group
}
