// Le passage entre le plan (des unités, 39 par mètre, y vers le bas) et la carte (longitude, latitude) : le plan est posé sur le centre du bâti, à l'échelle réelle et tourné
// comme la maison. Tout le plan vit en longitude et latitude une fois sur la carte : il ne peut plus glisser pendant un zoom.
import { MAP_ANCHOR, MAP_CENTER, MAP_ROTATION_DEG, MAP_UNITS_PER_METER } from './constants'
import { METERS_PER_DEGREE } from './helpers'

export type Point = [number, number]

const ANGLE = (MAP_ROTATION_DEG * Math.PI) / 180
const COS = Math.cos(ANGLE)
const SIN = Math.sin(ANGLE)
const METERS_PER_DEGREE_LNG = METERS_PER_DEGREE * Math.cos((MAP_CENTER[0] * Math.PI) / 180)

/** Un point du plan en [longitude, latitude] (l'ordre de MapLibre). */
export const planToLngLat = (x: number, y: number): Point => {
  const dx = (x - MAP_ANCHOR.x) / MAP_UNITS_PER_METER
  const dy = (y - MAP_ANCHOR.y) / MAP_UNITS_PER_METER
  const east = dx * COS - dy * SIN
  const south = dx * SIN + dy * COS
  return [MAP_CENTER[1] + east / METERS_PER_DEGREE_LNG, MAP_CENTER[0] - south / METERS_PER_DEGREE]
}

/** L'inverse : une longitude et une latitude en point du plan. */
export const lngLatToPlan = (lng: number, lat: number): Point => {
  const east = (lng - MAP_CENTER[1]) * METERS_PER_DEGREE_LNG
  const south = -(lat - MAP_CENTER[0]) * METERS_PER_DEGREE
  return [MAP_ANCHOR.x + (east * COS + south * SIN) * MAP_UNITS_PER_METER, MAP_ANCHOR.y + (-east * SIN + south * COS) * MAP_UNITS_PER_METER]
}
