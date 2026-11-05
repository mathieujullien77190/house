// Le lever et le coucher du soleil, calculés (équation du lever de soleil, précision de quelques minutes) :
// le pont Hue n'a pas de position, et les heures fixes de ses règles dérivent avec les saisons.
const RAD = Math.PI / 180
const DAY = 86400
/** Le soleil se lève ou se couche quand son centre est à 0,833° sous l'horizon (réfraction et rayon du disque). */
const HORIZON_DEGREES = -0.833

export interface Position {
  latitude: number
  longitude: number
}

/** Lever et coucher (secondes depuis 1970) du jour UTC contenant `at`, ou null au pôle (soleil qui ne se lève ou ne se couche pas). */
export const sunTimes = (at: number, position: Position): { rise: number; set: number } | null => {
  const unixDay = Math.floor(at / DAY)
  const n = unixDay - 10957
  const meanNoon = n - position.longitude / 360
  const anomaly = (357.5291 + 0.98560028 * meanNoon) % 360
  const center = 1.9148 * Math.sin(anomaly * RAD) + 0.02 * Math.sin(2 * anomaly * RAD) + 0.0003 * Math.sin(3 * anomaly * RAD)
  const longitude = (anomaly + center + 180 + 102.9372) % 360
  const transit = 2451545 + meanNoon + 0.0053 * Math.sin(anomaly * RAD) - 0.0069 * Math.sin(2 * longitude * RAD)
  const declination = Math.asin(Math.sin(longitude * RAD) * Math.sin(23.4397 * RAD))
  const cosHour = (Math.sin(HORIZON_DEGREES * RAD) - Math.sin(position.latitude * RAD) * Math.sin(declination)) / (Math.cos(position.latitude * RAD) * Math.cos(declination))
  if (cosHour < -1 || cosHour > 1) return null
  const hour = Math.acos(cosHour) / RAD / 360
  const toUnix = (julian: number): number => (julian - 2440587.5) * DAY
  return { rise: toUnix(transit - hour), set: toUnix(transit + hour) }
}

/**
 * Vrai si `at` est dans la nuit élargie : de `marginSeconds` avant le coucher du soleil jusqu'à `marginSeconds` après le
 * lever du lendemain. Là où le soleil ne se couche pas ou ne se lève pas, on dit non.
 */
export const isNight = (at: number, position: Position, marginSeconds: number): boolean => {
  const unixDay = Math.floor(at / DAY)
  for (const day of [unixDay - 1, unixDay]) {
    const today = sunTimes(day * DAY, position)
    const next = sunTimes((day + 1) * DAY, position)
    if (today && next && at >= today.set - marginSeconds && at <= next.rise + marginSeconds) return true
  }
  return false
}
