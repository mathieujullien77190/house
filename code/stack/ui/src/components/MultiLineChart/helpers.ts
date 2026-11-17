import { HEIGHT, WIDTH } from './constants'
import type { ChartSeries } from './types'

export interface Extent {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Les bornes de toutes les séries qui ont au moins deux points ; null s'il n'y en a aucune. L'échelle verticale s'arrondit aux degrés entiers, avec au moins 1 d'écart. */
export const extentOf = (series: ChartSeries[]): Extent | null => {
  const drawn = series.filter((s) => s.points.length >= 2)
  if (drawn.length === 0) return null
  const xs = drawn.flatMap((s) => s.points.map((p) => p.x))
  const ys = drawn.flatMap((s) => s.points.map((p) => p.y))
  const minY = Math.floor(Math.min(...ys))
  const maxY = Math.max(Math.ceil(Math.max(...ys)), minY + 1)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY, maxY }
}

/** Le tracé d'une série dans le cadre ; vide si elle a moins de deux points. */
export const pathOf = (series: ChartSeries, extent: Extent): string => {
  if (series.points.length < 2) return ''
  const width = extent.maxX - extent.minX || 1
  const height = extent.maxY - extent.minY
  const points = series.points.map((p) => `${(((p.x - extent.minX) / width) * WIDTH).toFixed(1)},${(HEIGHT - ((p.y - extent.minY) / height) * HEIGHT).toFixed(1)}`)
  return `M${points.join(' L')}`
}

/** Un repère de l'échelle : la valeur arrondie et son unité (« 12 °C »). */
export const formatTick = (value: number, unit: string): string => `${Math.round(value)}${unit ? ` ${unit}` : ''}`
