import * as THREE from 'three'

/** Les quatre saisons du jardin. */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
/** Le choix de la saison : l'une des quatre, ou « auto » (celle du jour). */
export type SeasonChoice = Season | 'auto'

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

/**
 * Ce qui, dans le jardin, n'est là qu'une partie de l'année (marque `userData.season`) :
 * - `evergreen` : un feuillage qui reste toute l'année (le laurier), marqué pour pouvoir changer de teinte ;
 * - `leaves` : les feuilles qui tombent (tout sauf le laurier et les spirées) ;
 * - `blossom` : les fleurs, au printemps seulement ;
 * - `cherries` : les cerises, au printemps ;
 * - `daisies` : les pâquerettes de la pelouse, au printemps et en été ;
 * - `medlars` : les nèfles, tant que le néflier a ses feuilles ;
 * - `harvest` : les fruits d'automne (les pommes, les grappes de la vigne vierge) ;
 * - `twigs` : le bois nu des arbustes qui n'ont pas de tiges dessinées, qu'on ne voit qu'en hiver.
 */
export type SeasonKey = 'evergreen' | 'leaves' | 'blossom' | 'cherries' | 'daisies' | 'medlars' | 'harvest' | 'twigs'

/** Les saisons où chaque marque se voit. */
export const SEASON_SHOWS: Record<SeasonKey, Season[]> = {
  evergreen: SEASONS,
  leaves: ['spring', 'summer', 'autumn'],
  blossom: ['spring'],
  cherries: ['spring'],
  daisies: ['spring', 'summer'],
  medlars: ['spring', 'summer', 'autumn'],
  harvest: ['autumn'],
  twigs: ['winter'],
}

/** Les teintes d'un feuillage selon la saison (une par matériau du feuillage) ; sans teinte pour une saison, il garde la sienne. */
export type SeasonTints = Partial<Record<Season, number[]>>

/** Les feuillages d'automne : le cerisier (orange, rouge, jaune), le pommier (jaune, ocre), le néflier (brun roux), le prunus (rouge cuivré), la glycine (jaune). */
export const AUTUMN = {
  cherry: [0xd9772b, 0xc4452a, 0xe0a52e],
  apple: [0xd8a531, 0xc98a2a, 0xb5642a],
  medlar: [0xb5702a, 0xc98f2e, 0x9a4f26],
  prunus: [0xb5482a, 0xc9742e, 0x8f2f2a],
  wisteria: [0xd6bd45],
}
/** Le laurier en été : ses feuilles jaunissent, deux touffes sur trois (la troisième garde son vert). */
export const LAUREL_SUMMER = [0xd8c63c, 0x386b33, 0xb9b536]

/** Marque un objet du jardin : il ne se voit qu'aux saisons de sa marque. */
export const inSeason = <T extends THREE.Object3D>(object: T, key: SeasonKey): T => {
  object.userData.season = key
  return object
}

/**
 * Les matériaux à facettes d'un feuillage, un par teinte. Chacun retient sa teinte de départ et celles qu'il prend à d'autres saisons
 * (`userData.foliage`) : `applySeason` les lui donne.
 */
export const foliage = (colors: number[], roughness: number, tints: SeasonTints = {}): THREE.MeshStandardMaterial[] =>
  colors.map((color, index) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, flatShading: true })
    const tones: Partial<Record<Season, number>> = {}
    for (const season of SEASONS) {
      const palette = tints[season]
      if (palette) tones[season] = palette[index % palette.length]
    }
    material.userData.foliage = { base: color, tones }
    return material
  })

interface Foliage {
  base: number
  tones: Partial<Record<Season, number>>
}

/** La saison d'un jour, dans l'hémisphère nord : le printemps commence le 20 mars, l'été le 21 juin, l'automne le 23 septembre, l'hiver le 21 décembre. */
export const seasonOf = (date: Date): Season => {
  const day = (date.getMonth() + 1) * 100 + date.getDate()
  if (day >= 320 && day < 621) return 'spring'
  if (day >= 621 && day < 923) return 'summer'
  if (day >= 923 && day < 1221) return 'autumn'
  return 'winter'
}

/**
 * Met le jardin à cette saison, sans rien reconstruire : chaque objet marqué (`userData.season`) se montre ou se cache, son feuillage
 * prend sa teinte de la saison, et un maillage aux feuilles teintées une à une (`userData.tints` : la vigne vierge) change ses teintes.
 */
export const applySeason = (root: THREE.Object3D, season: Season): void => {
  root.traverse((object) => {
    const key = object.userData.season as SeasonKey | undefined
    if (!key) return
    object.visible = SEASON_SHOWS[key].includes(season)
    const mesh = object as THREE.InstancedMesh
    const tones = (mesh.material as THREE.MeshStandardMaterial | undefined)?.userData.foliage as Foliage | undefined
    if (tones) (mesh.material as THREE.MeshStandardMaterial).color.setHex(tones.tones[season] ?? tones.base)
    const tints = mesh.userData.tints as (Partial<Record<Season, Float32Array>> & { base: Float32Array }) | undefined
    if (tints) {
      const colors = mesh.instanceColor as THREE.InstancedBufferAttribute
      ;(colors.array as Float32Array).set(tints[season] ?? tints.base)
      colors.needsUpdate = true
    }
  })
}
