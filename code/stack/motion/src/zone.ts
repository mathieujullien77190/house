// La zone de surveillance d'une caméra : un polygone dessiné sur l'image (WebApp), que l'enregistreur transforme en masque sur l'image analysée.
// Seuls les pixels dans le polygone comptent pour le mouvement. Fonctions pures, sans ffmpeg ni réseau.

/** Un sommet, en part de l'image : x de 0 (gauche) à 1 (droite), y de 0 (haut) à 1 (bas). */
export type Point = [number, number]

export const MIN_POINTS = 3
export const MAX_POINTS = 32

/** Un polygone valable : de 3 à 32 sommets, chacun deux nombres entre 0 et 1. Rend null sinon. */
export const parsePolygon = (value: unknown): Point[] | null => {
  if (!Array.isArray(value) || value.length < MIN_POINTS || value.length > MAX_POINTS) return null
  const points: Point[] = []
  for (const item of value) {
    if (!Array.isArray(item) || item.length !== 2) return null
    const [x, y] = item
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1)
      return null
    points.push([x, y])
  }
  return points
}

/** Le point est-il dans le polygone ? (le nombre de bords coupés par un rayon vers la droite est impair) */
const inside = (x: number, y: number, points: Point[]): boolean => {
  let result = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result
  }
  return result
}

/**
 * Le masque d'une image de `width` × `height` pixels : 1 pour un pixel dans le polygone (testé en son centre), 0 dehors.
 * Rend null quand tous les pixels sont dedans (le polygone par défaut, toute l'image : aucun masque à appliquer) ou quand aucun ne l'est
 * (une zone trop petite pour être vue : mieux vaut la détection sur toute l'image que plus aucune).
 */
export const polygonMask = (points: Point[], width: number, height: number): Uint8Array | null => {
  const mask = new Uint8Array(width * height)
  let count = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (inside((x + 0.5) / width, (y + 0.5) / height, points)) {
        mask[y * width + x] = 1
        count += 1
      }
    }
  }
  return count === 0 || count === mask.length ? null : mask
}
