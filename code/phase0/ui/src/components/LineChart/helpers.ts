import { HEIGHT, WIDTH } from './constants'

export interface Paths {
  line: string
  area: string
}

/** Un repère de l'échelle : la valeur arrondie et son unité (« 50 % »). */
export const formatTick = (value: number, unit: string): string => `${Math.round(value)}${unit ? ` ${unit}` : ''}`

const clamp = (value: number, max: number): number => Math.min(max, Math.max(0, value))

/** La courbe et sa surface : les mesures s'alignent sur la droite, la plus récente au bord. */
export const buildPaths = (values: number[], capacity: number, max: number): Paths | null => {
  if (values.length < 2 || capacity < 2 || max <= 0) return null
  const offset = capacity - values.length
  const points = values.map((value, index) => {
    const x = ((offset + index) / (capacity - 1)) * WIDTH
    const y = HEIGHT - (clamp(value, max) / max) * HEIGHT
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = `M${points.join(' L')}`
  const firstX = (offset / (capacity - 1)) * WIDTH
  return { line, area: `${line} L${WIDTH},${HEIGHT} L${firstX.toFixed(1)},${HEIGHT} Z` }
}
