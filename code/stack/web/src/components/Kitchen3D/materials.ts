import * as THREE from 'three'
import { COLORS } from './constants'
import { standard, woodTexture } from './primitives'
import { butcherTexture, lambrisTexture, terracottaTexture, tileTexture } from './textures'

// Les recettes qui reviennent d'un jeu de matériaux à l'autre : chaque appel rend un nouvel exemplaire.
/** Le blanc des menuiseries et des meubles blancs. */
const whitePaint = () => standard(0xf4f4f1, 0.6)
/** L'acier sombre des pieds de meubles et des tringles. */
const darkSteel = () => standard(0x1a1c1f, 0.45, 0.7)
/** Le bleu nuit des rideaux. */
const nightCurtain = () => standard(0x1b2848, 0.95)
/** Le laiton vieilli des douilles, du robinet de la niche et de la poignée de la porte d'entrée. */
export const oldBrass = () => standard(0xb08d3a, 0.4, 0.7)
/** La glace d'un miroir. */
export const mirrorGlass = () => standard(0xb9c4cc, 0.1, 0.8)
/** Un matériau à facettes (arbres et plantes du jardin). */
export const faceted = (color: number, roughness: number) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true })

/** Les textures du gros œuvre : le lambris du plafond, et le carrelage de la crédence (copié pour chaque pan : sa répétition dépend des cotes). */
export const kitchenMaps = () => ({ lambris: lambrisTexture(), tile: tileTexture() })

export type KitchenMaps = ReturnType<typeof kitchenMaps>

/** Les matériaux de la cuisine et du gros œuvre, créés une fois par scène. */
export const kitchenMaterials = (maps: KitchenMaps) => ({
  lambris: standard(maps.lambris, 0.85),
  plaster: standard(0xf7f5f1, 0.95),
  beam: standard(woodTexture(COLORS.beam, 41), 0.6),
  door: standard(COLORS.cabinet, 0.5),
  carcass: standard(COLORS.carcass, 0.7),
  plinth: standard(COLORS.plinth, 0.8),
  worktop: standard(butcherTexture(), 0.5),
  sink: standard(COLORS.sink, 0.1),
  drain: standard(0x2a2d31, 0.5, 0.4),
  brass: standard(COLORS.brass, 0.3, 0.9),
  hob: standard(COLORS.hob, 0.08, 0.1),
  hobRing: standard(COLORS.hobRing, 0.4),
  steel: standard(COLORS.steel, 0.3, 0.85, THREE.DoubleSide),
  nickel: standard(COLORS.nickel, 0.3, 0.9, THREE.DoubleSide),
  ovenGlass: standard(COLORS.ovenGlass, 0.05, 0.2),
  wall: standard(COLORS.wall, 0.95),
  tile: standard(maps.tile, 0.4),
  // Ce qu'on voit dans les joints du parquet.
  floor: standard(0xc8a070, 0.9),
  shelf: standard(woodTexture(COLORS.shelf, 53), 0.6),
  bracket: standard(COLORS.bracket, 0.6),
  windowFrame: standard(COLORS.window, 0.5),
  blind: standard(COLORS.blind, 0.9),
  glass: new THREE.MeshStandardMaterial({ color: COLORS.glass, roughness: 0.1, transparent: true, opacity: 0.14 }),
  lamp: standard(COLORS.lamp, 0.5, 0, THREE.DoubleSide),
  bottle: standard(COLORS.bottle, 0.2),
})

export type KitchenMaterials = ReturnType<typeof kitchenMaterials>

/** Les matériaux des meubles et du décor (hors cuisine), créés une fois par scène. */
export const furnitureMaterials = () => ({
  sofa: standard(0x4a3128, 0.95),
  red: standard(0xb3262a, 0.9),
  orange: standard(0xe39030, 0.9),
  metal: darkSteel(),
  woodOld: standard(woodTexture(0x91603a, 11), 0.6),
  // Le bois de la table de la salle à manger, plus clair : son plateau et ses poutres.
  tableTop: standard(woodTexture(0xb08458, 29), 0.6),
  tableBeam: standard(woodTexture(0x9c6c42, 31), 0.6),
  woodDark: standard(woodTexture(0x6b4429, 23), 0.6),
  woodLight: standard(woodTexture(0xc08a4a, 37), 0.6),
  leather: standard(0x6b3a22, 0.5),
  wicker: standard(0xcaa46a, 0.9, 0, THREE.DoubleSide),
  wickerDark: standard(0x2a2118, 0.9),
  chairOrange: standard(0xd9822b, 0.85),
  chairBlue: standard(0x24385c, 0.85),
  curtain: nightCurtain(),
  white: whitePaint(),
  black: standard(0x15171a, 0.45, 0.3),
  glass: new THREE.MeshStandardMaterial({ color: 0xd4e4f2, roughness: 0.05, transparent: true, opacity: 0.14 }),
  shutter: standard(0xdfe3e6, 0.6),
  // Les lames des volets : blanc cassé, un peu lumineuses d'elles-mêmes pour ne pas virer au noir quand il fait sombre dehors.
  slat: new THREE.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.7, emissive: 0xe6e8ea, emissiveIntensity: 0.25 }),
  bulb: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
  rug: standard(0xd6d6d2, 1),
  clock: standard(0xf2ede0, 0.6),
  frame: standard(0x8d8794, 0.7),
  plant: standard(0x3d6b3a, 0.8),
})

export type FurnitureMaterials = ReturnType<typeof furnitureMaterials>

/** Les matériaux de la chambre d'invité, de la salle de bain et du sas, créés une fois par scène. */
export const roomMaterials = () => ({
  white: whitePaint(),
  black: standard(0x15171a, 0.5, 0.3),
  acacia: standard(woodTexture(0xa0622f, 101), 0.55),
  oak: standard(woodTexture(0xc08a4a, 103), 0.6),
  pine: standard(woodTexture(0xe3c690, 107), 0.6),
  navy: standard(0x232a52, 0.9),
  burgundy: standard(0x6b2434, 0.95),
  blueWall: standard(0x1f4a6e, 0.85),
  groove: standard(0x173a57, 0.9),
  curtain: nightCurtain(),
  metal: darkSteel(),
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

export type RoomMaterials = ReturnType<typeof roomMaterials>

/** Les matériaux du jardin, créés une fois par scène. */
export const gardenMaterials = () => ({
  grass: standard(0x6f9a4a, 1, 0, THREE.DoubleSide),
  // Dehors, tout ce qui est carrelé (la terrasse, le pavage, le sol de la cage, le chemin du portillon) l'est en terre cuite.
  terrace: standard(terracottaTexture(), 0.85, 0, THREE.DoubleSide),
  concrete: standard(0xb9b9b4, 0.9, 0, THREE.DoubleSide),
  hedge: standard(0x2f5a2c, 1),
  iron: standard(0x2a2d31, 0.6, 0.4),
  // Le béton des marches entre les deux niveaux du jardin, et celui des murets bas.
  riser: standard(0xa9a79f, 0.95),
  wall: standard(0xa9a79f, 0.95),
  // Du douglas : un bois clair, proche du pin (les poteaux et les pans de la cage, les bacs).
  post: standard(woodTexture(0xdcb98a, 131), 0.8),
  soil: standard(0x4a2e22, 1),
})

export type GardenMaterials = ReturnType<typeof gardenMaterials>
