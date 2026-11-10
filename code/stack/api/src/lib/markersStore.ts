// Les repères de caméras : sur l'image d'une caméra, un petit 📷 par autre caméra, que l'on place où on veut ; un clic dessus ouvre cette autre caméra. Les positions sont gardées par
// l'API (STATE_DIR/markers.json), par caméra. Une caméra sans entrée a les positions de départ de la WebApp.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Un repère : la caméra qu'il ouvre et sa place par rapport à l'image (parts de l'image : x de 0 à gauche à 1 à droite, y de 0 en haut à 1 en bas). Il peut être **hors de la vidéo**, dans
 * le bloc qui l'entoure : de -0,5 à 1,5.
 */
export interface Marker {
  target: string
  x: number
  y: number
}
export type Markers = Record<string, Marker[]>

export const MAX_MARKERS = 8
/** Les places permises, en parts de l'image : un repère peut sortir de la vidéo d'une demi-image de chaque côté. */
export const MIN_PLACE = -0.5
export const MAX_PLACE = 1.5
const CAMERA = /^[\w-]{1,40}$/

export const isCameraName = (name: string): boolean => CAMERA.test(name)

/** Des repères valables : au plus 8, chacun avec une caméra cible et deux nombres entre -0,5 et 1,5 (arrondis à 4 décimales). Null sinon. */
export const parseMarkers = (value: unknown): Marker[] | null => {
  if (!Array.isArray(value) || value.length > MAX_MARKERS) return null
  const markers: Marker[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null
    const { target, x, y } = item as { target?: unknown; x?: unknown; y?: unknown }
    if (typeof target !== 'string' || !isCameraName(target)) return null
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) || x < MIN_PLACE || x > MAX_PLACE || y < MIN_PLACE || y > MAX_PLACE) return null
    markers.push({ target, x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 })
  }
  return markers
}

export const createMarkersStore = (file: string) => {
  const read = (): Markers => {
    try {
      const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
      const markers: Markers = {}
      for (const [camera, value] of Object.entries(parsed)) {
        const list = parseMarkers(value)
        if (isCameraName(camera) && list) markers[camera] = list
      }
      return markers
    } catch {
      return {}
    }
  }
  return {
    get: read,
    /** Fixe les repères d'une caméra, ou les retire (null : les places de départ) ; rend l'ensemble. Écrit dans un fichier temporaire puis le renomme. */
    set: (camera: string, list: Marker[] | null): Markers => {
      const next = read()
      if (list) next[camera] = list
      else delete next[camera]
      mkdirSync(dirname(file), { recursive: true })
      const partial = `${file}.tmp`
      writeFileSync(partial, JSON.stringify(next, null, 2))
      renameSync(partial, file)
      return next
    },
  }
}

export type MarkersStore = ReturnType<typeof createMarkersStore>
