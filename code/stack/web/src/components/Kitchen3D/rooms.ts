import * as THREE from 'three'
import { BATH_WINDOW, GUEST_WINDOW, REST, ROOM, SAS, WC_ALCOVE } from './constants'
import { box, bulbBall, canvasTexture, cylinder, fixtureBulb, seeded, standard, woodTexture } from './primitives'

const materialsOf = () => ({
  white: standard(0xf4f4f1, 0.6),
  black: standard(0x15171a, 0.5, 0.3),
  acacia: standard(woodTexture(0xa0622f, 101), 0.55),
  oak: standard(woodTexture(0xc08a4a, 103), 0.6),
  pine: standard(woodTexture(0xe3c690, 107), 0.6),
  navy: standard(0x232a52, 0.9),
  burgundy: standard(0x6b2434, 0.95),
  beige: standard(0xd8ceb6, 0.95),
  blueWall: standard(0x1f4a6e, 0.85),
  groove: standard(0x173a57, 0.9),
  curtain: standard(0x1b2848, 0.95),
  metal: standard(0x1a1c1f, 0.45, 0.7),
  wicker: standard(0xd9b676, 0.9, 0, THREE.DoubleSide),
  bulb: new THREE.MeshBasicMaterial({ color: 0xfff1cf }),
  chrome: standard(0xc9ccd0, 0.2, 0.9),
  green: standard(0xa3b79c, 0.85),
  line: standard(0xdfe3e6, 0.6),
  glass: new THREE.MeshStandardMaterial({ color: 0xd4e4f2, roughness: 0.05, transparent: true, opacity: 0.18 }),
  frosted: standard(0xdce9ee, 0.4),
  stone: standard(0xece8dc, 0.7),
  cream: standard(0xf0e8c8, 0.95),
})

type Materials = ReturnType<typeof materialsOf>

/**
 * La chambre d'invité (au nord-ouest), vue de sa porte : le mur du nord en lambris bleu, la clim au-dessus du lit, le lit de bois à tête
 * ajourée (drap bleu nuit, couette et oreillers bordeaux), deux suspensions noires de chaque côté, une table de chevet ronde, le plafonnier
 * en raphia ondulé (la lampe « Chambre »), le rideau bleu nuit, fermé, de la fenêtre du mur ouest ; contre le mur du sud, la commode et sa petite
 * télé, le miroir sur pied ; la porte ouverte, rabattue contre ce mur.
 */
const guestRoom = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const north = ROOM.xMax
  const south = REST.guestSouth
  const west = REST.west
  const east = REST.guestEast
  const middleZ = (west + east) / 2
  const height = ROOM.height
  // Le lambris bleu, à lames horizontales.
  group.add(box(0.012, height, east - west, m.blueWall, north - 0.006, height / 2, middleZ))
  for (let line = 1; line < 12; line += 1) group.add(box(0.003, 0.004, east - west, m.groove, north - 0.013, line * 0.2, middleZ))
  // Le lit, la tête au nord, centré sur le mur.
  const bedZ = middleZ
  const head = north - 0.05
  group.add(box(2.1, 0.3, 1.72, m.acacia, head - 1.05, 0.2, bedZ), box(2.0, 0.2, 1.6, m.navy, head - 1.05, 0.45, bedZ))
  for (const side of [-1, 1]) for (const end of [0.05, 2.05]) group.add(box(0.07, 0.1, 0.07, m.acacia, head - end, 0.05, bedZ + side * 0.8))
  group.add(box(0.05, 1.05, 1.72, m.acacia, head, 0.525, bedZ))
  for (let slat = 0; slat < 6; slat += 1) group.add(box(0.012, 0.012, 1.6, m.black, head - 0.028, 0.6 + slat * 0.075, bedZ))
  // La couette bordeaux, bien tirée sur tout le lit (elle retombe un peu sur les côtés et au pied), et les deux oreillers à la tête.
  group.add(box(1.62, 0.07, 1.68, m.burgundy, head - 1.26, 0.585, bedZ), box(1.62, 0.2, 0.02, m.burgundy, head - 1.26, 0.5, bedZ - 0.84), box(1.62, 0.2, 0.02, m.burgundy, head - 1.26, 0.5, bedZ + 0.84))
  group.add(box(0.02, 0.2, 1.68, m.burgundy, head - 2.07, 0.5, bedZ))
  for (const side of [-1, 1]) group.add(box(0.42, 0.12, 0.66, m.burgundy, head - 0.28, 0.61, bedZ + side * 0.4))
  // La clim, en haut du lambris ; les deux suspensions noires de part et d'autre du lit ; la table de chevet.
  // La clim : la même qu'au salon (un bloc blanc, une barre en bas, un voyant en bas à droite), reliée à la vraie clim de la chambre
  // d'invité : un clic l'allume ou l'éteint, le voyant dit son état (`live.ts`).
  const acZ = middleZ + 0.05
  const acBody = box(0.22, 0.3, 0.95, m.white, north - 0.12, 2.05, acZ)
  acBody.userData.acUnit = 'chambre-invite'
  const led = box(0.006, 0.015, 0.03, new THREE.MeshBasicMaterial({ color: 0x8a8f96 }), north - 0.233, 1.94, acZ + 0.445)
  led.userData.acLed = 'chambre-invite'
  group.add(acBody, led, box(0.02, 0.02, 0.8, m.metal, north - 0.24, 1.95, acZ))
  for (const z of [bedZ - 0.98, bedZ + 0.98]) {
    group.add(cylinder(0.05, 0.05, 0.02, m.black, north - 0.2, height - 0.01, z), box(0.006, height - 1.36, 0.006, m.black, north - 0.2, (height + 1.36) / 2, z))
    group.add(cylinder(0.03, 0.03, 0.09, m.black, north - 0.2, 1.31, z, 12), new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), m.bulb).translateX(north - 0.2).translateY(1.25).translateZ(z))
  }
  const tableZ = bedZ + 1.06
  group.add(cylinder(0.2, 0.2, 0.03, m.acacia, north - 0.32, 0.5, tableZ))
  for (const turn of [0, 2.1, 4.2]) group.add(box(0.012, 0.5, 0.012, m.black, north - 0.32 + Math.cos(turn) * 0.12, 0.25, tableZ + Math.sin(turn) * 0.12))
  // Le plafonnier : un cône noir au plafond, un fil, une corolle de raphia ondulée et l'ampoule.
  const lampX = (north + south) / 2
  group.add(cylinder(0.02, 0.06, 0.07, m.black, lampX, height - 0.035, middleZ), box(0.008, 0.2, 0.008, m.black, lampX, height - 0.17, middleZ))
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.12, 12, 1, true), m.wicker)
  shade.position.set(lampX, height - 0.31, middleZ)
  group.add(shade, fixtureBulb(bulbBall(0.045, lampX, height - 0.33, middleZ), 'chambre'))
  // La fenêtre du mur ouest (le mur est percé, `helpers.ts`) : un cadre blanc à deux vantaux et ses vitres, derrière le rideau.
  const windowY = GUEST_WINDOW.bottom + GUEST_WINDOW.height / 2
  for (const side of [-1, 1]) {
    group.add(box(0.05, GUEST_WINDOW.height, 0.07, m.white, GUEST_WINDOW.z + side * (GUEST_WINDOW.width / 2 - 0.025), windowY, west - 0.025))
    group.add(box(GUEST_WINDOW.width, 0.05, 0.07, m.white, GUEST_WINDOW.z, windowY + side * (GUEST_WINDOW.height / 2 - 0.025), west - 0.025))
  }
  group.add(box(0.06, GUEST_WINDOW.height - 0.1, 0.07, m.white, GUEST_WINDOW.z, windowY, west - 0.025), box(GUEST_WINDOW.width - 0.1, GUEST_WINDOW.height - 0.1, 0.006, m.glass, GUEST_WINDOW.z, windowY, west - 0.025))
  // Le rideau de la fenêtre, contre le mur ouest : le même qu'au salon (bleu nuit, plis sombres, tringle de métal), mais fermé.
  const curtainX = GUEST_WINDOW.z
  const curtainWide = 1.5
  group.add(box(curtainWide, 2.24, 0.1, m.curtain, curtainX, 1.13, west + 0.2))
  for (let fold = 0; fold < 15; fold += 1) group.add(box(0.03, 2.24, 0.02, m.black, curtainX - curtainWide / 2 + 0.05 + fold * 0.1, 1.13, west + 0.26))
  group.add(box(curtainWide + 0.4, 0.03, 0.03, m.metal, curtainX, 2.27, west + 0.22))
  // Contre le mur du sud : la commode à trois tiroirs et sa petite télé, le miroir sur pied, la pile de coussins dans le coin.
  // La commode laisse la place du battant de la porte, rabattu contre ce mur (68 cm) plus 12 cm de jeu.
  const chestZ = east - 0.8 - 0.475
  group.add(box(0.45, 0.72, 0.95, m.acacia, south + 0.27, 0.48, chestZ), box(0.48, 0.03, 0.99, m.acacia, south + 0.27, 0.855, chestZ))
  for (const z of [-0.43, 0.43]) for (const x of [0.08, 0.46]) group.add(box(0.04, 0.12, 0.04, m.acacia, south + x, 0.06, chestZ + z))
  for (let drawer = 0; drawer < 3; drawer += 1) group.add(box(0.006, 0.012, 0.5, m.black, south + 0.497, 0.74 - drawer * 0.22, chestZ))
  group.add(box(0.03, 0.36, 0.62, m.black, south + 0.22, 1.08, chestZ), box(0.12, 0.02, 0.22, m.black, south + 0.22, 0.88, chestZ))
  // Le miroir sur pied, calé dans le coin sud-ouest, tourné vers la pièce et un peu penché en arrière.
  const mirrorZ = west + 0.3
  const mirror = new THREE.Group()
  mirror.position.set(south + 0.3, 0, mirrorZ)
  mirror.rotation.set(0, -Math.PI / 4, -0.1)
  mirror.add(box(0.04, 1.6, 0.5, m.acacia, 0, 0.85, 0), box(0.006, 1.48, 0.4, standard(0xb9c4cc, 0.1, 0.8), 0.023, 0.85, 0))
  group.add(mirror)
  // La porte, ouverte d'un quart de tour contre le mur du sud.
  group.add(box(0.04, 2.03, 0.68, m.white, south + 0.04, 1.015, east - 0.36), box(0.03, 0.02, 0.1, m.line, south + 0.075, 1.02, east - 0.63))
  return group
}

/** Le carrelage de la douche : des carreaux de 13 cm environ, verts clairs, sauge, crème et vert sapin, de plus en plus sombres vers le bas. */
const showerTiles = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    const rand = seeded(47)
    const count = 16
    const size = 512 / count
    ctx.fillStyle = '#f4f4f0'
    ctx.fillRect(0, 0, 512, 512)
    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        // En bas, surtout du vert sapin ; en haut, surtout du crème et du vert clair.
        const pick = rand() + (row / count - 0.5) * 0.9
        ctx.fillStyle = pick > 0.8 ? '#1f4a47' : pick > 0.45 ? '#9db7a6' : pick > 0.15 ? '#b9cdbd' : '#eeece2'
        ctx.fillRect(column * size + 1, row * size + 1, size - 2, size - 2)
      }
    }
  })

/**
 * La salle de bain : le mur ouest vert au-dessus d'un lambris blanc à cimaise de chêne (porte-serviette, étagère haute), la fenêtre dépolie
 * du mur nord, le meuble de bois à vasque de pierre et son miroir, la douche dans l'angle (receveur blanc, carrelage vert sur deux murs,
 * paroi de verre, colonne chromée), les deux tapis ; et, dans le coin sud-est, les WC derrière leur cloison : cuvette suspendue, plaque
 * noire, niche éclairée, cadres, porte coulissante à moitié ouverte.
 */
const bathroom = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const north = ROOM.xMax
  const south = REST.bathSouth
  const west = REST.bathWest
  const east = ROOM.zMin
  const height = ROOM.height
  const middleX = (north + south) / 2
  // Les spots encastrés du plafond : un par lampe Hue de la pièce (les deux du lavabo sont plus bas) : une
  // collerette chromée et l'ampoule.
  // Trois en ligne dans l'allée, de la fenêtre à la porte (« SdB 1 », « SdB 4 », « SdB 3 », comme sur le plan de Home), et un au-dessus
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
  // Elle prend tout le mur, à 5 cm de chaque bout, et le traverse (le mur est percé, `helpers.ts`) : un habillage de chêne autour de
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
  // Les WC : dans le coin sud-est, fermés au nord par une cloison (carrelée côté douche), ouverts à l'ouest.
  const wcNorth = south + 1.0
  const wcWest = east - 0.9
  group.add(box(0.07, height, east - wcWest, m.white, wcNorth, height / 2, (east + wcWest) / 2))
  const bowlX = WC_ALCOVE.x
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), m.white)
  bowl.scale.set(0.9, 0.75, 1.3)
  bowl.position.set(bowlX, 0.3, east - 0.3)
  const lid = box(0.36, 0.44, 0.03, m.white, bowlX, 0.62, east - 0.05)
  lid.rotation.x = -0.12
  group.add(bowl, lid, box(0.22, 0.16, 0.012, m.black, bowlX, 1.05, east - 0.006))
  // L'alcôve au-dessus : un creux dans le mur épais (le mur de la pièce est percé, `helpers.ts`), du même blanc que le mur, avec sa
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
  for (const [dz, y, wide, tall] of [[-0.55, 1.95, 0.3, 0.2], [-0.5, 1.5, 0.4, 0.55], [-0.3, 1.05, 0.16, 0.22]]) {
    group.add(box(0.02, tall, wide, m.acacia, wcNorth - 0.045, y, east + dz), box(0.004, tall - 0.06, wide - 0.06, m.white, wcNorth - 0.056, y, east + dz))
  }
  group.add(box(0.14, 0.3, 0.3, m.white, wcNorth - 0.11, 0.15, east - 0.15), box(0.15, 0.02, 0.32, m.oak, wcNorth - 0.11, 0.31, east - 0.15))
  for (const dz of [0.06, 0.16, 0.26]) group.add(cylinder(0.05, 0.05, 0.1, m.cream, wcNorth - 0.11, 0.37, east - dz, 14))
  // La douche, au nord des WC, le long du mur est : receveur blanc, carrelage sur le mur est et sur la cloison, paroi de verre, colonne.
  // Le receveur, mesuré : 90 cm de large (depuis le mur est) sur 1,10 m de long (depuis la cloison des WC).
  const trayDeep = 0.9
  const trayLong = 1.1
  const trayNorth = wcNorth + 0.035 + trayLong
  const trayX = (trayNorth + wcNorth + 0.035) / 2
  group.add(box(trayLong, 0.04, trayDeep, standard(0xd0d2d3, 0.6), trayX, 0.02, east - trayDeep / 2), box(0.1, 0.004, 0.1, standard(0x5a4636, 0.5, 0.5), trayX, 0.042, east - trayDeep / 2))
  const tiles = new THREE.MeshStandardMaterial({ map: showerTiles(), roughness: 0.35 })
  // Le carrelage ne couvre que la douche (pas de crédence au-dessus du lavabo), et passe devant la plinthe du mur : pas de plinthe dans la douche.
  const wallTiles = new THREE.Mesh(new THREE.PlaneGeometry(trayNorth - wcNorth, 2.2), tiles)
  wallTiles.rotation.y = Math.PI
  wallTiles.position.set((trayNorth + wcNorth) / 2, 1.1, east - 0.018)
  const sideTiles = new THREE.Mesh(new THREE.PlaneGeometry(trayDeep, 2.2), tiles)
  sideTiles.rotation.y = Math.PI / 2
  sideTiles.position.set(wcNorth + 0.039, 1.1, east - trayDeep / 2)
  group.add(wallTiles, sideTiles)
  // La paroi de verre, entre la douche et le lavabo : d'équerre au mur, sur toute la largeur du receveur, tenue en haut par une barre
  // chromée qui file jusqu'à la cloison des WC.
  const showerGlass = new THREE.MeshStandardMaterial({ color: 0xcfe3e0, roughness: 0.05, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
  group.add(box(0.01, 2.0, trayDeep, showerGlass, trayNorth, 1.0, east - trayDeep / 2), box(trayLong, 0.03, 0.03, m.chrome, trayX, 2.0, east - trayDeep + 0.02))
  group.add(cylinder(0.012, 0.012, 1.3, m.chrome, trayX - 0.1, 1.45, east - 0.05, 10), box(0.03, 0.03, 0.3, m.chrome, trayX - 0.1, 2.1, east - 0.18), cylinder(0.11, 0.05, 0.05, m.chrome, trayX - 0.1, 2.06, east - 0.33, 20))
  group.add(box(0.16, 0.05, 0.06, m.chrome, trayX - 0.1, 1.05, east - 0.07))
  // Le meuble de la vasque, tourné d'un quart de tour : adossé au mur est, entre la douche et le mur nord. Bois, vasque de pierre, robinet,
  // miroir encadré de bois et sa tablette.
  const vanityX = (trayNorth + north) / 2
  const vanityZ = east - 0.24
  group.add(box(0.56, 0.82, 0.45, m.acacia, vanityX, 0.41, vanityZ), box(0.42, 0.12, 0.4, m.stone, vanityX, 0.86, vanityZ - 0.01))
  group.add(box(0.03, 0.12, 0.03, m.chrome, vanityX, 0.95, east - 0.08), box(0.03, 0.02, 0.12, m.chrome, vanityX, 1.0, east - 0.13))
  group.add(box(0.5, 0.62, 0.03, m.acacia, vanityX, 1.55, east - 0.015), box(0.38, 0.5, 0.005, standard(0xb9c4cc, 0.1, 0.8), vanityX, 1.58, east - 0.032), box(0.5, 0.02, 0.1, m.acacia, vanityX, 1.22, east - 0.05))
  // Les deux spots du lavabo (« SdB 6 » et « SdB 7 ») : au plafond, côte à côte, juste devant le miroir.
  for (const [name, side] of [['sdb 6', -1], ['sdb 7', 1]] as [string, number][]) {
    const spotX = vanityX + side * 0.22
    group.add(cylinder(0.05, 0.05, 0.012, m.chrome, spotX, height - 0.006, east - 0.35, 20), fixtureBulb(bulbBall(0.03, spotX, height - 0.02, east - 0.35), name))
  }
  // Le montant de chêne au bout de la cloison ; le tapis crème devant la douche et le tapis vert devant le lavabo.
  group.add(box(0.08, 2.1, 0.05, m.oak, wcNorth, 1.05, wcWest - 0.025))
  group.add(box(0.95, 0.02, 0.5, m.cream, trayX, 0.012, east - trayDeep - 0.3), box(0.6, 0.015, 0.45, standard(0x8f9f7c, 0.95), vanityX, 0.01, east - 0.75))
  return group
}

/**
 * Le sas : la porte du dehors, blanche, à neuf carreaux dépolis, dans le mur sud ; la fenêtre à deux vantaux du mur est, encadrée de chêne ; dessous, l'étagère à chaussures ; dans le mur nord, la niche des manteaux (fond bleu, banc de chêne sur
 * trois paniers, étagère haute), et l'applique à cage de jute ; le miroir encadré de chêne sur le
 * mur sud.
 */
const sas = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const { south, north, west, east } = SAS
  // La porte du dehors, dans son embrasure : un panneau plein en bas, neuf carreaux dépolis en haut, une poignée noire.
  const doorZ = (SAS.door[0] + SAS.door[1]) / 2
  const doorWide = SAS.door[1] - SAS.door[0]
  // La porte est au fond de l'embrasure, dans l'épaisseur du mur (30 cm).
  const doorX = south - 0.22
  const glazed = doorWide - 0.2
  group.add(box(0.045, 2.0, doorWide - 0.07, m.white, doorX, 1.01, doorZ), box(0.05, 1.05, glazed, m.frosted, doorX, 1.42, doorZ))
  for (const cut of [-1, 1]) group.add(box(0.056, 1.05, 0.025, m.white, doorX, 1.42, doorZ + (cut * glazed) / 6), box(0.056, 0.025, glazed, m.white, doorX, 1.42 + cut * 0.175, doorZ))
  group.add(box(0.05, 0.12, 0.02, m.black, doorX + 0.03, 1.02, doorZ + doorWide / 2 - 0.09), box(0.02, 0.02, 0.1, m.black, doorX + 0.06, 1.05, doorZ + doorWide / 2 - 0.13))
  // L'habillage de chêne de l'embrasure, pris dans l'épaisseur du mur, au nu du mur intérieur : deux montants et la traverse du dessus.
  for (const side of [-1, 1]) group.add(box(0.3, 2.05, 0.03, m.oak, south - 0.148, 1.025, doorZ + side * (doorWide / 2 - 0.015)))
  group.add(box(0.3, 0.03, doorWide, m.oak, south - 0.148, 2.035, doorZ))
  // La fenêtre du mur est : cadre de chêne, deux vantaux blancs, leurs vitres.
  const { z: windowX, width, bottom, height: tall } = SAS.window
  const middleY = bottom + tall / 2
  for (const side of [-1, 1]) {
    group.add(box(0.03, tall + 0.06, 0.04, m.oak, windowX + side * (width / 2 + 0.015), middleY, east - 0.02), box(width + 0.06, 0.03, 0.04, m.oak, windowX, middleY + side * (tall / 2 + 0.015), east - 0.02))
    group.add(box(0.05, tall, 0.04, m.white, windowX + side * (width / 2 - 0.025), middleY, east + 0.01), box(width, 0.05, 0.04, m.white, windowX, middleY + side * (tall / 2 - 0.025), east + 0.01))
    group.add(box(width / 2 - 0.08, tall - 0.1, 0.008, m.glass, windowX + side * (width / 4 - 0.01), middleY, east + 0.01))
  }
  group.add(box(0.07, tall, 0.04, m.white, windowX, middleY, east + 0.01))
  // Le grand tapis sombre, du milieu du sas jusqu'au mur de la fenêtre.
  // Il part de l'aplomb de l'applique du mur nord et couvre tout le reste du sas, d'un mur à l'autre et jusqu'au mur de la fenêtre ;
  // il entre dans l'embrasure de la porte du dehors.
  const matFrom = (SAS.laundry[1] + SAS.nook[0]) / 2
  group.add(box(north - south - 0.004, 0.012, east - matFrom - 0.002, standard(0x3f4247, 0.95), (north + south) / 2, 0.006, (east + matFrom) / 2))
  group.add(box(0.3, 0.012, SAS.door[1] - SAS.door[0], standard(0x3f4247, 0.95), south - 0.15, 0.006, (SAS.door[0] + SAS.door[1]) / 2))
  // Sous la fenêtre : l'étagère à chaussures en lattes de bois, deux niveaux.
  const rackX = windowX - 0.05
  for (const y of [0.14, 0.3]) group.add(box(0.7, 0.02, 0.26, m.oak, rackX, y, east - 0.16))
  for (const side of [-1, 1]) group.add(box(0.02, 0.3, 0.26, m.oak, rackX + side * 0.34, 0.15, east - 0.16))
  // Le coin des manteaux : une niche creusée dans le mur nord (le mur est percé, `helpers.ts`). Ses joues et son plafond blancs, son fond
  // bleu, le banc de chêne sur trois paniers (son plateau dépasse un peu du mur), et l'étagère haute.
  const [nookFrom, nookTo] = SAS.nook
  const nookZ = (nookFrom + nookTo) / 2
  const nookWide = nookTo - nookFrom
  const deep = SAS.nookDepth
  const lining = new THREE.Mesh(new THREE.BoxGeometry(deep, SAS.nookTop, nookWide), new THREE.MeshStandardMaterial({ color: 0xf4f4f1, roughness: 0.6, side: THREE.BackSide }))
  lining.position.set(north + deep / 2, SAS.nookTop / 2, nookZ)
  group.add(lining, box(0.008, SAS.nookTop - 0.46, nookWide - 0.004, m.blueWall, north + deep - 0.006, (SAS.nookTop + 0.46) / 2, nookZ))
  group.add(box(deep, 0.42, nookWide - 0.004, m.white, north + deep / 2, 0.21, nookZ), box(deep + 0.05, 0.04, nookWide - 0.004, m.oak, north + deep / 2 - 0.025, 0.44, nookZ))
  for (const cut of [-1, 0, 1]) group.add(box(0.02, 0.28, nookWide / 3 - 0.04, m.wicker, north - 0.004, 0.2, nookZ + (cut * nookWide) / 3))
  group.add(box(deep - 0.02, 0.03, nookWide - 0.004, m.oak, north + deep / 2, 1.9, nookZ))
  // L'applique, sur le mur entre la porte de la buanderie et la niche : une rosace noire, un bras, une cage de jute et son ampoule.
  const lampZ = (SAS.laundry[1] + nookFrom) / 2
  group.add(cylinder(0.06, 0.06, 0.02, m.black, north - 0.01, 2.0, lampZ).rotateZ(Math.PI / 2), box(0.26, 0.012, 0.012, m.black, north - 0.14, 2.05, lampZ))
  const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.9, wireframe: true }))
  cage.position.set(north - 0.26, 1.92, lampZ)
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), m.bulb)
  glow.position.copy(cage.position)
  group.add(cage, glow)
  // Le miroir encadré de chêne, sur le mur sud, près de la porte d'entrée.
  group.add(box(0.03, 1.5, 0.55, m.oak, south + 0.015, 1.15, west + 0.5), box(0.006, 1.36, 0.42, standard(0xb9c4cc, 0.1, 0.8), south + 0.033, 1.15, west + 0.5))
  return group
}

/** Les pièces meublées hors de l'espace de vie : la chambre d'invité, la salle de bain et le sas. */
export const buildRooms = (): THREE.Group => {
  const m = materialsOf()
  const group = new THREE.Group()
  group.add(guestRoom(m), bathroom(m), sas(m))
  return group
}
