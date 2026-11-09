import { COLOR_STOPS, GAMMA, SCALE_PERCENTILE } from './constants'

/** Le compteur d'un seuil : des Uint16 petit-boutistes en base64 (`cells` valeurs). */
export const decodeLevel = (encoded: string, cells: number): Uint16Array => {
  const binary = atob(encoded)
  const bytes = new Uint8Array(cells * 2)
  for (let i = 0; i < bytes.length && i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Uint16Array(bytes.buffer)
}

/** La couleur (rouge, vert, bleu, opacité) d'une valeur de 0 à 1, entre les deux arrêts qui l'encadrent. */
export const colorOf = (value: number): [number, number, number, number] => {
  const v = Math.min(1, Math.max(0, value))
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const [end, to] = COLOR_STOPS[i]!
    const [start, from] = COLOR_STOPS[i - 1]!
    if (v <= end) {
      const t = (v - start) / (end - start)
      return [0, 1, 2, 3].map((channel) => Math.round(from[channel]! + (to[channel]! - from[channel]!) * t)) as [
        number,
        number,
        number,
        number,
      ]
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1]![1]
}

/** Les pixels RGBA de la carte : chaque case est réglée sur l'échelle de la carte (le 99ᵉ centile des cases non nulles), puis écrasée par `GAMMA`. */
export const paint = (counts: Uint16Array): Uint8ClampedArray => {
  const filled = [...counts].filter((count) => count > 0).sort((a, b) => a - b)
  const scale = filled.length > 0 ? filled[Math.min(filled.length - 1, Math.floor(filled.length * SCALE_PERCENTILE))]! : 1
  const pixels = new Uint8ClampedArray(counts.length * 4)
  counts.forEach((count, i) => {
    const [r, g, b, a] = colorOf(Math.pow(Math.min(1, count / scale), GAMMA))
    pixels.set([r, g, b, a], i * 4)
  })
  return pixels
}
