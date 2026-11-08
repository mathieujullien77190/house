export const METERS_PER_DEGREE = 111320
const EARTH_CIRCUMFERENCE_AT_ZOOM_0 = 156543.03392

/** Les mètres par pixel d'une carte à ce niveau de zoom, à cette latitude (tuiles de 256 px). */
export const metersPerPixel = (latitude: number, zoom: number): number =>
  (EARTH_CIRCUMFERENCE_AT_ZOOM_0 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom

/** Le point situé à `east` mètres à l'est et `south` mètres au sud de `origin` (latitude, longitude). */
export const offsetBy = (origin: [number, number], east: number, south: number): [number, number] => [
  origin[0] - south / METERS_PER_DEGREE,
  origin[1] + east / (METERS_PER_DEGREE * Math.cos((origin[0] * Math.PI) / 180)),
]
