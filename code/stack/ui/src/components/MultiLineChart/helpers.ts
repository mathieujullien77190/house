import { HEIGHT, WIDTH } from './constants'
import type { ChartSeries } from './types'

export interface Extent {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Les bornes de toutes les séries qui ont au moins deux points ; null s'il n'y en a aucune. L'échelle verticale s'arrondit aux degrés entiers, avec au moins 1 d'écart. */
export const extentOf = (series: ChartSeries[], domain?: { from: number; to: number }): Extent | null => {
  const drawn = series.filter((s) => s.points.length >= 2)
  if (drawn.length === 0) return null
  const xs = drawn.flatMap((s) => s.points.map((p) => p.x))
  const ys = drawn.flatMap((s) => s.points.map((p) => p.y))
  const minY = Math.floor(Math.min(...ys))
  const maxY = Math.max(Math.ceil(Math.max(...ys)), minY + 1)
  return { minX: domain?.from ?? Math.min(...xs), maxX: domain?.to ?? Math.max(...xs), minY, maxY }
}

/** Le tracé d'une série dans le cadre ; vide si elle a moins de deux points. */
export const pathOf = (series: ChartSeries, extent: Extent): string => {
  if (series.points.length < 2) return ''
  const width = extent.maxX - extent.minX || 1
  const height = extent.maxY - extent.minY
  const points = series.points.map((p) => `${(((p.x - extent.minX) / width) * WIDTH).toFixed(1)},${(HEIGHT - ((p.y - extent.minY) / height) * HEIGHT).toFixed(1)}`)
  return `M${points.join(' L')}`
}

/** Les bâtons d'une série : un trait vertical par point, du bas du cadre à sa valeur. */
export const barsOf = (series: ChartSeries, extent: Extent): string => {
  const width = extent.maxX - extent.minX || 1
  const height = extent.maxY - extent.minY
  return series.points
    .filter((p) => p.x >= extent.minX && p.x <= extent.maxX)
    .map((p) => `M${(((p.x - extent.minX) / width) * WIDTH).toFixed(1)},${HEIGHT} V${(HEIGHT - ((p.y - extent.minY) / height) * HEIGHT).toFixed(1)}`)
    .join(' ')
}

/** Un repère de l'échelle : la valeur arrondie et son unité (« 12 °C »). */
export const formatTick = (value: number, unit: string): string => `${Math.round(value)}${unit ? ` ${unit}` : ''}`
