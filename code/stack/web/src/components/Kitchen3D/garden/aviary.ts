import * as THREE from 'three'
import type { GardenMaterials } from '@/components/Kitchen3D/materials'
import { box, bulbBall, cylinder, fixtureBulb, noShadow, standard } from '@/components/Kitchen3D/primitives'
import { wireTexture } from '@/components/Kitchen3D/textures'
import { CAGE_HEIGHT, CAGE_LOW, GRASS, LOW, PANEL } from './constants'
import { SITE } from './layout'
import { fern, hydrangea } from './plants'

/** La cage à perruches : des poteaux et une ceinture en haut. */
export const cageFrame = (group: THREE.Group, m: GardenMaterials): void => {
  const { post } = m
  const { cageX1, cageX2, cageZ1, cageZ2, cageDepth, middleX, backX, turnZ } = SITE
  // Son plan est en L : à gauche de la porte (pour qui la regarde du dehors), la cage tourne d'équerre vers le fond sur un panneau, puis
  // repart d'équerre vers l'ouest sur deux panneaux. Le coin sud-ouest (deux panneaux sur un) est donc dehors.
  const step = PANEL
  const corners: [number, number][] = [[cageX1, turnZ], [cageX1, cageZ2], [cageX2, cageZ2], [cageX2, cageZ1], [backX, cageZ1], [backX, turnZ], [middleX, cageZ2]]
  // Le grand côté grillagé (à l'ouest) fait quatre panneaux de 85 cm : un poteau entre chacun.
  for (const index of [1, 2, 3]) corners.push([backX + step * index, cageZ1])
  // La face en retrait (derrière le grand bac) fait deux panneaux : un poteau entre eux.
  corners.push([backX, cageZ1 + step])
  for (const [x, z] of corners) {
    const tall = z === cageZ2 ? CAGE_LOW : CAGE_HEIGHT
    group.add(box(0.08, tall, 0.08, post, x, tall / 2, z))
  }
  // La ceinture du haut, sur tout le tour.
  group.add(box(cageDepth, 0.06, 0.06, post, middleX, CAGE_LOW, cageZ2), box(cageDepth - step, 0.06, 0.06, post, (backX + cageX2) / 2, CAGE_HEIGHT, cageZ1))
  group.add(box(0.06, 0.06, turnZ - cageZ1, post, cageX2, CAGE_HEIGHT, (turnZ + cageZ1) / 2))
  // Sous le toit de tôle, les lisses de l'avant et du fond suivent sa pente (rien ne le traverse).
  const slope = Math.atan2(CAGE_HEIGHT - CAGE_LOW, cageZ2 - turnZ)
  for (const x of [cageX1, cageX2]) {
    const rail = box(0.06, 0.06, cageZ2 - turnZ, post, x, (CAGE_HEIGHT + CAGE_LOW) / 2, (cageZ2 + turnZ) / 2)
    rail.rotation.x = slope
    group.add(rail)
  }
  group.add(box(step, 0.06, 0.06, post, cageX1 + step / 2, CAGE_HEIGHT, turnZ), box(0.06, 0.06, step * 2, post, backX, CAGE_HEIGHT, cageZ1 + step))
}

/** Le grillage de la cage : des pans gris à peine opaques, là où il n’y a pas de bois, et sur le dessus. Il laisse passer le soleil : pas d'ombre portée. */
export const cageWire = (group: THREE.Group, m: GardenMaterials): void => {
  const { post } = m
  const { cageX1, cageX2, cageZ1, cageDepth, middleX, backX, turnZ } = SITE
  const step = PANEL
  const wireMap = wireTexture()
  const wire = (long: number, tall: number): THREE.Mesh => {
    const map = wireMap.clone()
    map.repeat.set(long / 0.2, tall / 0.2)
    map.needsUpdate = true
    return noShadow(new THREE.Mesh(new THREE.PlaneGeometry(long, tall), new THREE.MeshStandardMaterial({ map, transparent: true, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4, depthWrite: false })))
  }
  // Du grillage seulement là où il n'y a pas de bois : le côté ouest, le retour d'un panneau à gauche de la porte, puis les deux panneaux
  // en retrait (ni derrière la porte, ni derrière les pans de bois).
  const westWire = wire(cageDepth - step, CAGE_HEIGHT)
  westWire.position.set((backX + cageX2) / 2, CAGE_HEIGHT / 2, cageZ1)
  const turnWire = wire(step, CAGE_HEIGHT)
  turnWire.position.set(cageX1 + step / 2, CAGE_HEIGHT / 2, turnZ)
  const backWire = wire(step * 2, CAGE_HEIGHT)
  backWire.rotation.y = Math.PI / 2
  backWire.position.set(backX, CAGE_HEIGHT / 2, cageZ1 + step)
  // Le dessus de la partie grillagée : des pans de grillage de 85 cm de large, entre des chevrons ; et l'arête du milieu, d'où part le toit.
  const topWire = wire(cageDepth - step, step * 2)
  topWire.rotation.x = -Math.PI / 2
  topWire.position.set((backX + cageX2) / 2, CAGE_HEIGHT + 0.03, cageZ1 + step)
  group.add(westWire, turnWire, backWire, topWire, box(cageDepth, 0.06, 0.06, post, middleX, CAGE_HEIGHT, turnZ))
  for (const index of [1, 2, 3]) group.add(box(0.05, 0.05, step * 2, post, backX + step * index, CAGE_HEIGHT, cageZ1 + step))
}

/**
 * Au-dessus de la porte et du pan de bois à sa droite, un toit de tôle, de l'avant jusqu'au fond de la cage. Il est en biais : au plus
 * haut sur l'arête du milieu de la cage (2,10 m), au plus bas côté haie (2 m). Ses ondes suivent la pente.
 */
export const cageRoof = (group: THREE.Group): void => {
  const { cageZ2, cageDepth, middleX, turnZ } = SITE
  const sheet = standard(0xb4b8bc, 0.45, 0.6)
  const roofSpan = cageZ2 - turnZ
  const roofLong = cageDepth + 0.3
  const roof = new THREE.Group()
  // Il déborde de 10 cm de chaque côté : côté haie, et côté milieu de la cage, par-dessus l'arête.
  roof.position.set(middleX, (CAGE_HEIGHT + CAGE_LOW) / 2 + 0.04, (cageZ2 + turnZ) / 2)
  roof.rotation.x = Math.atan2(CAGE_HEIGHT - CAGE_LOW, roofSpan)
  roof.add(box(roofLong, 0.012, roofSpan + 0.2, sheet, 0, 0, 0))
  for (let wave = 0; wave < 24; wave += 1) roof.add(box(0.05, 0.02, roofSpan + 0.2, sheet, -roofLong / 2 + 0.05 + wave * ((roofLong - 0.1) / 23), 0.01, 0))
  group.add(roof)
}

/**
 * Un pan de bois de la cage (85 cm, d'après photo) : des planches horizontales d'une douzaine de centimètres, séparées d'un joint, tenues dans
 * un cadre (deux montants, une traverse en haut et une en bas) qui dépasse des deux côtés. `along` : l'axe le long duquel il s'étend ; (x, z) : son milieu.
 */
const woodPan = (group: THREE.Group, wood: THREE.Material, along: 'x' | 'z', x: number, z: number, tall: number): void => {
  // Un pavé du pan : sa largeur le long du pan, son épaisseur en travers, et son décalage le long du pan.
  const piece = (wide: number, high: number, thick: number, shift: number, y: number): THREE.Mesh =>
    along === 'x' ? box(wide, high, thick, wood, x + shift, y, z) : box(thick, high, wide, wood, x, y, z + shift)
  const stile = 0.045
  const boards = Math.round(tall / 0.13)
  for (let board = 0; board < boards; board += 1) group.add(piece(PANEL - stile * 2, tall / boards - 0.004, 0.018, 0, (tall * (board + 0.5)) / boards))
  for (const side of [-1, 1]) group.add(piece(stile, tall, 0.04, side * (PANEL / 2 - stile / 2 - 0.003), tall / 2))
  for (const y of [stile / 2, tall - stile / 2]) group.add(piece(PANEL - stile * 2, stile, 0.036, 0, y))
}

/**
 * Une porte de la cage, dans un pan de 85 cm du mur `wallX`, centrée en `doorZ`, haute de `tall` ; elle se regarde depuis −x.
 */
const cageDoor = (group: THREE.Group, post: THREE.Material, iron: THREE.Material, wallX: number, doorZ: number, tall: number): void => {
  // La porte (d'après photo) : un bâti (deux montants, une traverse haute), et dedans un vantail de planches horizontales tenu par un cadre,
  // une traverse du milieu et deux écharpes en biais ; trois pentures noires en T à droite (pour qui la regarde du dehors), un loquet à gauche.
  const doorFace = wallX - 0.02
  const jamb = 0.06
  group.add(box(0.05, tall, jamb, post, doorFace, tall / 2, doorZ - PANEL / 2 + jamb / 2 + 0.01), box(0.05, tall, jamb, post, doorFace, tall / 2, doorZ + PANEL / 2 - jamb / 2 - 0.01))
  group.add(box(0.05, 0.09, PANEL - 0.02 - jamb * 2, post, doorFace, tall - 0.045, doorZ))
  const [leafWide, leafLow, leafHigh] = [PANEL - 0.02 - jamb * 2 - 0.012, 0.03, tall - 0.1]
  const leafTall = leafHigh - leafLow
  const boards = 12
  for (let board = 0; board < boards; board += 1) group.add(box(0.016, leafTall / boards - 0.004, leafWide, post, doorFace, leafLow + (leafTall * (board + 0.5)) / boards, doorZ))
  // Le cadre du vantail, posé sur les planches : deux montants, trois traverses (haut, milieu aux deux cinquièmes, bas).
  const [rail, frameX] = [0.07, doorFace - 0.02]
  const middle = leafLow + leafTall * 0.4
  for (const side of [-1, 1]) group.add(box(0.024, leafTall, rail, post, frameX, leafLow + leafTall / 2, doorZ + side * (leafWide / 2 - rail / 2)))
  const inner = leafWide - rail * 2
  for (const y of [leafLow + rail / 2, middle, leafHigh - rail / 2]) group.add(box(0.024, rail, inner, post, frameX, y, doorZ))
  // Les écharpes : celle du haut monte vers les pentures, celle du bas descend vers elles.
  const brace = (fromY: number, toY: number): void => {
    const piece = box(0.022, 0.06, Math.hypot(toY - fromY, inner), post, frameX, (fromY + toY) / 2, doorZ)
    piece.rotation.x = -Math.atan2(toY - fromY, inner)
    group.add(piece)
  }
  brace(middle + rail / 2, leafHigh - rail)
  brace(middle - rail / 2, leafLow + rail)
  for (const y of [leafLow + rail / 2, middle, leafHigh - rail / 2]) {
    group.add(box(0.008, 0.035, 0.2, iron, frameX - 0.016, y, doorZ + leafWide / 2 - 0.09), box(0.008, 0.11, 0.035, iron, frameX - 0.012, y, doorZ + PANEL / 2 - jamb / 2 - 0.01))
  }
  group.add(box(0.02, 0.03, 0.12, iron, frameX - 0.02, 1.05, doorZ - leafWide / 2 + 0.03))
}

/** Les pans de bois de la cage et sa porte. */
export const cagePanels = (group: THREE.Group, m: GardenMaterials): void => {
  const { iron, post } = m
  const { cageX1, cageX2, cageZ2 } = SITE
  const pan = PANEL
  // Les pans de bois de la cage (85 cm chacun), devant le grillage : sur la face sud, la porte puis un pan plein à sa droite (pour qui
  // la regarde du dehors) ; derrière, côté haie de l'est, cinq pans (tout le côté) ; et au fond, contre la haie du nord, quatre pans
  // (tout le fond).
  const doorZ = cageZ2 - pan * 1.5
  // Sous le toit, les pans de bois et la porte s'arrêtent sous la tôle : le panneau près de l'arête à mi-pente, celui du bord au plus bas.
  const midTall = (CAGE_HEIGHT + CAGE_LOW) / 2
  woodPan(group, post, 'z', cageX1, cageZ2 - pan / 2, CAGE_LOW)
  for (let index = 0; index < 5; index += 1) woodPan(group, post, 'x', cageX2 - pan * (index + 0.5), cageZ2, CAGE_LOW)
  for (const [index, tall] of [CAGE_LOW, midTall, CAGE_HEIGHT, CAGE_HEIGHT].entries()) woodPan(group, post, 'z', cageX2, cageZ2 - pan * (index + 0.5), tall)
  // Le mur des deux pans grillagés du bac (`backX`) continue dans la cage, sous la tôle, sur deux pans jusqu'au côté de la haie : une porte (en face de celle de l'entrée), puis un pan de bois plein.
  woodPan(group, post, 'z', SITE.backX, cageZ2 - pan / 2, CAGE_LOW)
  // Au fond de la cage, sur la limite entre le toit de tôle et le toit grillagé (`turnZ`) : trois panneaux d'OSB de 85 cm, debout, du fond vers le milieu de la cage.
  const osb = standard(0xc9a56b, 0.9)
  for (let panel = 0; panel < 3; panel += 1) group.add(box(pan - 0.01, CAGE_HEIGHT - 0.02, 0.018, osb, cageX2 - pan * (panel + 0.5), (CAGE_HEIGHT - 0.02) / 2, SITE.turnZ))
  cageDoor(group, post, iron, cageX1, doorZ, midTall)
  // En face d'elle, dans la cloison de bois (`backX`), une seconde porte, la même.
  cageDoor(group, post, iron, SITE.backX, doorZ, midTall)
}

/** Un bac creux : quatre planches de bois (de `bottom` à `top`) et de la terre dedans, jusqu'à `soilTop`, un peu sous le bord. `size` : x puis z ; `at` : le centre. */
const tub = (group: THREE.Group, wood: THREE.Material, soil: THREE.Material, size: [number, number], [bottom, top]: [number, number], soilTop: number, at: [number, number]): void => {
  const [long, wide] = size
  const [x, z] = at
  const tall = top - bottom
  const board = 0.04
  group.add(
    box(long, tall, board, wood, x, bottom + tall / 2, z - wide / 2 + board / 2),
    box(long, tall, board, wood, x, bottom + tall / 2, z + wide / 2 - board / 2),
    box(board, tall, wide - board * 2, wood, x - long / 2 + board / 2, bottom + tall / 2, z),
    box(board, tall, wide - board * 2, wood, x + long / 2 - board / 2, bottom + tall / 2, z),
    box(long - board * 2, soilTop - bottom, wide - board * 2, soil, x, (bottom + soilTop) / 2, z),
  )
}

/** Les bacs de bois pleins de terre, devant la cage, et leurs plantes. */
export const planters = (group: THREE.Group, m: GardenMaterials): void => {
  const { post, soil } = m
  const { cageX2, cageZ1, backX } = SITE
  // Le bac de bois plein de terre, sur le devant, contre la face en retrait ; il continue le long du grand côté grillagé (à l'ouest, dans
  // la partie basse du jardin), deux fois moins haut et deux fois moins large.
  // Il avance vers l'ouest jusqu'au bord extérieur du long bac du côté : les deux se rejoignent à l'angle.
  const planterLong = 1.05 + 0.4
  const planterZ = cageZ1 - 0.4 + planterLong / 2
  tub(group, post, soil, [0.8, planterLong], [-LOW, 0.45], 0.43, [backX - 0.45, planterZ])
  // Le long bac part du grand, collé à lui.
  const sideFrom = backX - 0.05
  const sideLong = cageX2 - sideFrom
  tub(group, post, soil, [sideLong, 0.4], [GRASS, GRASS + 0.225], GRASS + 0.205, [(cageX2 + sideFrom) / 2, cageZ1 - 0.2])
  // Dans le long bac : trois fougères à droite pour qui le regarde face à la cage (le bout sud, vers le grand bac), un hortensia à gauche.
  const bedY = GRASS + 0.215
  ;[0.4, 0.95, 1.5].forEach((along, index) => {
    const plant = fern(21 + index)
    plant.position.set(sideFrom + along, bedY, cageZ1 - 0.2)
    group.add(plant)
  })
  const bush = hydrangea(5)
  bush.position.set(cageX2 - 0.55, bedY, cageZ1 - 0.2)
  group.add(bush)
}

/**
 * Les outils de jardin pendus dans la petite partie de la cage (derrière la porte d'entrée). Contre le pan de bois de la haie : une bêche, une
 * pioche, un râteau et un balai, le manche en bas ou en haut selon l'outil ; contre le pan plein de la cloison : une cisaille et un sécateur,
 * à un clou. Chaque outil est construit à plat contre son mur : x le long du mur, y vers le haut, z vers la pièce.
 */
export const cageTools = (group: THREE.Group, m: GardenMaterials): void => {
  const { iron } = m
  const { cageZ2, backX } = SITE
  const wood = standard(0xb58a5a, 0.8)
  const straw = standard(0xcfb46a, 0.95)
  const red = standard(0xb5322c, 0.6)
  // Un manche vertical, de `from` à `to` (m du sol), et le clou qui le tient.
  const handle = (tool: THREE.Group, from: number, to: number): void => {
    tool.add(cylinder(0.014, 0.014, to - from, wood, 0, (from + to) / 2, 0.03, 10), box(0.012, 0.012, 0.05, iron, 0.03, to - 0.12, 0.025))
  }
  const spade = new THREE.Group()
  handle(spade, 0.42, 1.3)
  spade.add(box(0.18, 0.28, 0.006, iron, 0, 0.28, 0.03), box(0.12, 0.025, 0.025, wood, 0, 1.31, 0.03))
  const pick = new THREE.Group()
  handle(pick, 0.3, 1.25)
  const head = box(0.46, 0.04, 0.035, iron, 0, 1.25, 0.03)
  pick.add(head, box(0.05, 0.07, 0.05, iron, 0, 1.25, 0.03))
  const rake = new THREE.Group()
  handle(rake, 0.2, 1.6)
  rake.add(box(0.36, 0.02, 0.02, iron, 0, 1.6, 0.03))
  for (let tooth = 0; tooth < 9; tooth += 1) rake.add(box(0.008, 0.008, 0.06, iron, -0.16 + tooth * 0.04, 1.6, 0.06))
  const broom = new THREE.Group()
  handle(broom, 0.32, 1.5)
  broom.add(box(0.3, 0.045, 0.045, wood, 0, 0.3, 0.035), box(0.3, 0.14, 0.035, straw, 0, 0.21, 0.035))
  // Contre le pan de la haie (z = `cageZ2`) : la pièce est du côté −z.
  ;[spade, pick, rake, broom].forEach((tool, index) => {
    tool.position.set(backX - 0.14 - index * 0.19, 0, cageZ2 - 0.012)
    tool.rotation.y = Math.PI
    group.add(tool)
  })
  // La cisaille : deux lames longues croisées, deux poignées de bois ; le sécateur : plus petit, poignées rouges.
  const scissors = (blade: number, grip: number, thick: number, gripMaterial: THREE.Material): THREE.Group => {
    const tool = new THREE.Group()
    for (const side of [-1, 1]) {
      const half = new THREE.Group()
      half.add(box(thick, blade, 0.004, iron, 0, -blade / 2, 0.012 + side * 0.003), box(thick * 1.3, grip, thick * 1.3, gripMaterial, 0, grip / 2, 0.012 + side * 0.003))
      half.rotation.z = side * 0.14
      tool.add(half)
    }
    tool.add(box(0.012, 0.012, 0.03, iron, 0, grip * 0.2, 0.015))
    return tool
  }
  const shears = scissors(0.26, 0.22, 0.022, wood)
  const pruner = scissors(0.07, 0.13, 0.014, red)
  // Contre le pan plein de la cloison (x = `backX`) : la pièce est du côté −x.
  ;[shears, pruner].forEach((tool, index) => {
    tool.position.set(backX - 0.03, 1.35, cageZ2 - PANEL / 2 + (index === 0 ? -0.15 : 0.18))
    tool.rotation.y = -Math.PI / 2
    group.add(tool)
  })
}

/**
 * Dans la cage : la lampe des perruches (une boule d'osier posée par terre, son ampoule est la lampe « perruche » de la maison) et le chauffage
 * (un petit radiateur blanc qu'on transporte, posé sur les carreaux, branché sur la prise connectée : marqué `userData.plug`, il se clique ; son voyant,
 * `userData.plugLed`, dit si la prise est allumée).
 */
export const cageComfort = (group: THREE.Group): void => {
  const { cageX2, turnZ } = SITE
  // La lampe : une boule d'osier posée par terre, à côté du radiateur.
  const [lampX, lampY, lampZ] = [cageX2 - PANEL * 1.5 - 0.5, 0.16, turnZ + 0.2]
  const wicker = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshStandardMaterial({ color: 0xb98a4e, roughness: 0.9, wireframe: true }))
  wicker.position.set(lampX, lampY, lampZ)
  group.add(noShadow(wicker), fixtureBulb(bulbBall(0.05, lampX, lampY, lampZ), 'perruche'))
  // Le radiateur : un corps blanc à ailettes sur deux pieds, une poignée, un bandeau de commande et son voyant.
  const heater = new THREE.Group()
  const white = standard(0xeeeeea, 0.5)
  heater.add(box(0.42, 0.4, 0.1, white, 0, 0.27, 0), box(0.42, 0.05, 0.12, standard(0x2a2c2f, 0.6), 0, 0.495, 0))
  for (let fin = 0; fin < 7; fin += 1) heater.add(box(0.012, 0.36, 0.13, white, -0.18 + fin * 0.06, 0.27, 0))
  for (const side of [-1, 1]) heater.add(box(0.04, 0.07, 0.2, standard(0x2a2c2f, 0.6), side * 0.17, 0.035, 0))
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0x4a4640 }))
  led.position.set(0.16, 0.5, 0.062)
  led.userData.plugLed = true
  heater.add(led)
  // Contre les panneaux d'OSB (leur face côté toit de tôle), au milieu de leur longueur, parallèle à eux.
  heater.position.set(cageX2 - PANEL * 1.5, 0, turnZ + 0.09)
  heater.rotation.y = 0
  heater.userData.plug = true
  group.add(heater)
}
