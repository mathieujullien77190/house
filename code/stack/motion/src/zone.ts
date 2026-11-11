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

/**
 * L'intersection de la zone surveillée (un polygone quelconque) avec un contour **convexe** : Sutherland-Hodgman, la zone étant le sujet et le contour
 * le découpeur (le découpeur doit être convexe, pas le sujet). Rend le contour tel quel sans zone, et null s'il ne reste rien (moins de 3 sommets).
 */
export const clipToZone = (shape: Point[], zone: Point[] | null): Point[] | null => {
  if (!zone) return shape
  // Le sens du découpeur : l'intérieur est du côté où l'aire signée est positive.
  const area = shape.reduce((sum, [x, y], i) => sum + x * shape[(i + 1) % shape.length][1] - shape[(i + 1) % shape.length][0] * y, 0)
  const sign = area >= 0 ? 1 : -1
  const inside = (a: Point, b: Point, p: Point) => sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0
  const cut = (a: Point, b: Point, p: Point, q: Point): Point => {
    const d1x = q[0] - p[0]
    const d1y = q[1] - p[1]
    const d2x = b[0] - a[0]
    const d2y = b[1] - a[1]
    const t = ((a[0] - p[0]) * d2y - (a[1] - p[1]) * d2x) / (d1x * d2y - d1y * d2x)
    return [p[0] + t * d1x, p[1] + t * d1y]
  }
  let output = zone
  for (let i = 0; i < shape.length && output.length > 0; i += 1) {
    const a = shape[i]
    const b = shape[(i + 1) % shape.length]
    const input = output
    output = []
    input.forEach((current, j) => {
      const previous = input[(j + input.length - 1) % input.length]
      if (inside(a, b, current)) {
        if (!inside(a, b, previous)) output.push(cut(a, b, previous, current))
        output.push(current)
      } else if (inside(a, b, previous)) output.push(cut(a, b, previous, current))
    })
  }
  return output.length >= 3 ? output : null
}
