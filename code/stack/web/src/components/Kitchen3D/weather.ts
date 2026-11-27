import * as THREE from 'three'
import { BASE, OUTER_WALL, ROOM, SAS } from './constants'
import { LOT, LOW } from './garden/constants'
import { SITE } from './garden/layout'
import { gardenX, gardenZ } from './garden/plan'
import { seeded } from './primitives'
import { flakeTexture } from './textures'
import { still, sway, swaying, WIND } from './wind'

/** Le temps qu'il fait dans la scène : soleil, pluie ou neige (le vent s'y ajoute à part). */
export type Sky = 'sun' | 'rain' | 'snow'

export const SKIES: Sky[] = ['sun', 'rain', 'snow']

/**
 * Ce que le temps change à la lumière : la part de l'ambiance du jour et celle du soleil qui restent (sous la pluie, le ciel est gris et
 * les ombres s'effacent ; sous la neige, il est clair mais sans soleil franc), et la couleur du ciel derrière la scène (`null` : pas de
 * fond, comme par beau temps).
 */
export const WEATHER_LOOK: Record<Sky, { ambient: number; sun: number; background: number | null }> = {
  sun: { ambient: 1, sun: 1, background: null },
  rain: { ambient: 0.6, sun: 0.2, background: 0x8d98a5 },
  snow: { ambient: 0.85, sun: 0.35, background: 0xd3d9df },
}

/**
 * La pluie et la neige : combien de gouttes ou de flocons, leur vitesse de chute et celle où le vent les pousse (m/s), la longueur du
 * trait d'une goutte et la taille d'un flocon (m).
 */
export const FALL = {
  rain: { count: 5000, fall: 13, drift: 6, long: 0.35 },
  snow: { count: 4000, fall: 1.2, drift: 2.2, size: 0.07 },
}

/**
 * L'air où il pleut et neige (repère de la scène) : au-dessus de tout le terrain, du sol du jardin jusqu'à 9 m. Au-dessus de la maison
 * et du sas (qui n'ont pas de toit dessiné), rien ne descend plus bas que le haut des murs (`roof`) : il ne pleut pas dans les pièces.
 */
export const AIR = {
  x1: gardenX(LOT.centerY + LOT.radius),
  x2: gardenX(LOT.north),
  z1: gardenZ(LOT.centerX - LOT.radius),
  z2: gardenZ(LOT.east),
  floor: -BASE.rise - LOW,
  top: 9,
  roof: ROOM.height + 0.3,
}

/** Les emprises couvertes : la maison, puis le sas qui en dépasse à l'est ([x1, x2, z1, z2]). */
const ROOFS: [number, number, number, number][] = [SITE.house, [SAS.south - OUTER_WALL, SAS.north + OUTER_WALL, SITE.house[3], SAS.east + OUTER_WALL]]

/** Vrai au-dessus de la maison ou du sas. */
export const sheltered = (x: number, z: number): boolean => ROOFS.some(([x1, x2, z1, z2]) => x > x1 && x < x2 && z > z1 && z < z2)

/** Des places tirées au hasard dans tout l'air (au-dessus des toits seulement, sur la maison) : trois nombres par goutte. */
const scatter = (count: number, seed: number): Float32Array => {
  const rand = seeded(seed)
  const places = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const x = AIR.x1 + rand() * (AIR.x2 - AIR.x1)
    const z = AIR.z1 + rand() * (AIR.z2 - AIR.z1)
    const low = sheltered(x, z) ? AIR.roof : AIR.floor
    places.set([x, low + rand() * (AIR.top - low), z], index * 3)
  }
  return places
}

/** L'allure de chaque goutte, un peu plus vite ou plus lente que les autres. */
const paces = (count: number, seed: number): Float32Array => {
  const rand = seeded(seed)
  return Float32Array.from({ length: count }, () => 0.75 + rand() * 0.5)
}

/**
 * Fait tomber les gouttes pendant `dt` secondes : elles descendent, dérivent avec le vent (et flottent un peu de côté si `flutter`), et
 * celles qui sortent de l'air y rentrent par le bord opposé. Arrivées au sol, ou au haut des murs sur la maison, elles repartent d'en haut.
 */
const drop = (places: Float32Array, pace: Float32Array, dt: number, fall: number, driftX: number, driftZ: number, flutter: number, time: number): void => {
  const spanX = AIR.x2 - AIR.x1
  const spanZ = AIR.z2 - AIR.z1
  for (let index = 0; index < pace.length; index += 1) {
    const at = index * 3
    let x = places[at] + (driftX + flutter * Math.sin(time * 1.1 + index * 1.7)) * dt
    let y = places[at + 1] - fall * pace[index] * dt
    let z = places[at + 2] + (driftZ + flutter * Math.cos(time * 0.9 + index * 2.3)) * dt
    if (x > AIR.x2) x -= spanX
    else if (x < AIR.x1) x += spanX
    if (z > AIR.z2) z -= spanZ
    else if (z < AIR.z1) z += spanZ
    // (Poussée par le vent sous le haut des murs, une goutte y est reprise aussi : elle ne traverse pas la maison.)
    if (y < AIR.roof && sheltered(x, z)) y = AIR.top - ((AIR.roof - y) % (AIR.top - AIR.roof))
    else if (y < AIR.floor) y += AIR.top - AIR.floor
    places[at] = x
    places[at + 1] = y
    places[at + 2] = z
  }
}

/**
 * La couche de neige : chaque objet marqué (`userData.snow`, posé par `snowTop`) reçoit une copie blanche de lui-même, soulevée de
 * l'épaisseur de sa neige : on n'en voit que le dessus et un liseré (ses flancs, confondus avec ceux de l'objet, passent derrière eux).
 * Les sols y disparaissent tout entiers. Cachée tant qu'il ne neige pas.
 */
const snowCaps = (root: THREE.Object3D): THREE.Mesh[] => {
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f8fb, roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
  const tops: THREE.Mesh[] = []
  root.traverse((object) => {
    if (typeof object.userData.snow === 'number') tops.push(object as THREE.Mesh)
  })
  return tops.map((source) => {
    const many = source as THREE.InstancedMesh
    const cap = many.isInstancedMesh ? new THREE.InstancedMesh(source.geometry, white, many.count) : new THREE.Mesh(source.geometry, white)
    if (many.isInstancedMesh) (cap as THREE.InstancedMesh).instanceMatrix.copy(many.instanceMatrix)
    cap.position.copy(source.position)
    cap.position.y += source.userData.snow as number
    cap.quaternion.copy(source.quaternion)
    cap.scale.copy(source.scale)
    cap.receiveShadow = true
    cap.visible = false
    ;(source.parent as THREE.Object3D).add(cap)
    return cap
  })
}

/** Le temps de la scène : `apply` le règle (ciel, vent), `step` le fait avancer d'un pas de la boucle de dessin. */
export interface Weather {
  apply: (sky: Sky, wind: boolean) => void
  step: (dt: number) => void
}

/**
 * Le temps qu'il fait dans la scène, préparé une fois : la pluie (des traits, un seul objet), la neige (des points, un seul objet), la
 * couche de neige sur ce qui la retient, et la liste de ce qui se balance dans le vent. Tout est caché par beau temps sans vent, et rien
 * n'est créé ensuite : `step` déplace les gouttes dans leurs tableaux.
 */
export const createWeather = (scene: THREE.Scene, root: THREE.Object3D): Weather => {
  const drops = scatter(FALL.rain.count, 211)
  const dropPace = paces(FALL.rain.count, 223)
  // Une goutte est un trait court dans le sens de sa chute : deux points, recalculés à chaque pas.
  const streaks = new THREE.BufferGeometry()
  streaks.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FALL.rain.count * 6), 3))
  const rain = new THREE.LineSegments(streaks, new THREE.LineBasicMaterial({ color: 0xb4c8dc, transparent: true, opacity: 0.55 }))
  rain.name = 'rain'
  const flakes = new THREE.BufferGeometry()
  flakes.setAttribute('position', new THREE.BufferAttribute(scatter(FALL.snow.count, 227), 3))
  const flakePace = paces(FALL.snow.count, 229)
  const snow = new THREE.Points(flakes, new THREE.PointsMaterial({ color: 0xffffff, size: FALL.snow.size, map: flakeTexture(), alphaTest: 0.5, transparent: true }))
  snow.name = 'snow'
  for (const fall of [rain, snow]) {
    // Ses points bougent sans cesse : pas de tri par le champ de la caméra.
    fall.frustumCulled = false
    fall.visible = false
    scene.add(fall)
  }
  const caps = snowCaps(root)
  const movers = swaying(root)
  const backdrop = (sky: Sky): THREE.Color | null => {
    const color = WEATHER_LOOK[sky].background
    return color === null ? null : new THREE.Color(color)
  }
  const backgrounds: Record<Sky, THREE.Color | null> = { sun: backdrop('sun'), rain: backdrop('rain'), snow: backdrop('snow') }
  const streak = new THREE.Vector3()
  let now: Sky = 'sun'
  let windy = false
  let time = 0

  const apply = (sky: Sky, wind: boolean): void => {
    now = sky
    rain.visible = sky === 'rain'
    snow.visible = sky === 'snow'
    for (const cap of caps) cap.visible = sky === 'snow'
    scene.background = backgrounds[sky]
    if (windy && !wind) still(movers)
    windy = wind
    // Le trait d'une goutte suit sa chute : d'aplomb sans vent, penché avec lui.
    const push = wind ? FALL.rain.drift : 0
    streak.set(WIND.x * push, -FALL.rain.fall, WIND.z * push).normalize().multiplyScalar(FALL.rain.long)
  }

  const step = (dt: number): void => {
    time += dt
    if (windy) sway(movers, time)
    if (now === 'rain') {
      const push = windy ? FALL.rain.drift : 0
      drop(drops, dropPace, dt, FALL.rain.fall, WIND.x * push, WIND.z * push, 0, time)
      const points = streaks.attributes.position.array as Float32Array
      for (let index = 0; index < FALL.rain.count; index += 1) {
        const from = index * 3
        const to = index * 6
        points[to] = drops[from]
        points[to + 1] = drops[from + 1]
        points[to + 2] = drops[from + 2]
        points[to + 3] = drops[from] - streak.x
        points[to + 4] = drops[from + 1] - streak.y
        points[to + 5] = drops[from + 2] - streak.z
      }
      streaks.attributes.position.needsUpdate = true
    } else if (now === 'snow') {
      const push = windy ? FALL.snow.drift : 0
      drop(flakes.attributes.position.array as Float32Array, flakePace, dt, FALL.snow.fall, WIND.x * push, WIND.z * push, 0.25, time)
      flakes.attributes.position.needsUpdate = true
    }
  }

  return { apply, step }
}
