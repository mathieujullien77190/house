// Les zones de surveillance du mouvement : pour chaque caméra, un polygone dessiné sur l'image dans la WebApp, gardé par l'API (STATE_DIR/zones.json).
// House Sync le lit (en lecture seule) et le donne à l'enregistreur. Une caméra sans entrée est surveillée sur toute l'image.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** Un sommet, en part de l'image : x de 0 (gauche) à 1 (droite), y de 0 (haut) à 1 (bas). */
export type ZonePoint = [number, number]
export type Zones = Record<string, ZonePoint[]>

export const MIN_POINTS = 3
export const MAX_POINTS = 1000
const CAMERA = /^[\w-]{1,40}$/

export const isCameraName = (name: string): boolean => CAMERA.test(name)

/** Un polygone valable : de 3 à 1000 sommets, chacun deux nombres entre 0 et 1 (arrondis à 4 décimales). Null sinon. */
export const parsePolygon = (value: unknown): ZonePoint[] | null => {
  if (!Array.isArray(value) || value.length < MIN_POINTS || value.length > MAX_POINTS) return null
  const points: ZonePoint[] = []
  for (const item of value) {
    if (!Array.isArray(item) || item.length !== 2) return null
    const [x, y] = item as unknown[]
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1)
      return null
    points.push([Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000])
  }
  return points
}

export const createZonesStore = (file: string) => {
  const read = (): Zones => {
    try {
      const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
      const zones: Zones = {}
      for (const [camera, value] of Object.entries(parsed)) {
        const polygon = parsePolygon(value)
        if (isCameraName(camera) && polygon) zones[camera] = polygon
      }
      return zones
    } catch {
      return {}
    }
  }
  return {
    get: read,
    /** Fixe la zone d'une caméra (un polygone), ou la retire (null : toute l'image) ; rend l'ensemble. Écrit dans un fichier temporaire puis le renomme. */
    set: (camera: string, points: ZonePoint[] | null): Zones => {
      const next = read()
      if (points) next[camera] = points
      else delete next[camera]
      mkdirSync(dirname(file), { recursive: true })
      const partial = `${file}.tmp`
      writeFileSync(partial, JSON.stringify(next, null, 2))
      renameSync(partial, file)
      return next
    },
  }
}

export type ZonesStore = ReturnType<typeof createZonesStore>
