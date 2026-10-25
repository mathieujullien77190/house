import { describeEvent } from '@/lib/format'
import type { EventRow } from '@/types'
import { MIN_WIDTH, RANGES } from './constants'
import type { Marker, RangeId, Tick } from './types'

const rangeOf = (id: RangeId) => RANGES.find((r) => r.id === id) ?? RANGES[0]

/** Position d'un instant sur l'axe, en % de la fenêtre [now - seconds, now]. */
const positionOf = (time: number, now: number, seconds: number): number => ((time - (now - seconds)) / seconds) * 100

const tickLabel = (time: number, rangeId: RangeId): string => {
  const date = new Date(time * 1000)
  if (rangeId === '7d') return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Les graduations : des heures rondes (ou des minuits pour 7 jours), de la plus ancienne à la plus récente. */
export const buildTicks = (rangeId: RangeId, now: number): Tick[] => {
  const { seconds, tick } = rangeOf(rangeId)
  const start = now - seconds
  // Aligner sur l'heure locale : des heures rondes (ou minuit, pour 7 jours) telles qu'on les lit ici.
  const offset = new Date(now * 1000).getTimezoneOffset() * 60
  const first = Math.ceil((start - offset) / tick) * tick + offset
  const ticks: Tick[] = []
  for (let time = first; time < now; time += tick) {
    const x = positionOf(time, now, seconds)
    if (x > 1) ticks.push({ x, label: tickLabel(time, rangeId) })
  }
  return ticks
}

/** Les événements de la fenêtre posés sur l'axe, et le nombre de ceux qui sont plus anciens. */
export const buildMarkers = (events: EventRow[], rangeId: RangeId, now: number, selectedId: string): { markers: Marker[]; older: number } => {
  const { seconds } = rangeOf(rangeId)
  const start = now - seconds
  const visible = events.filter((event) => (event.ended_at ?? event.started_at) >= start)
  const markers = [...visible].reverse().map((event) => {
    const x = Math.max(0, positionOf(event.started_at, now, seconds))
    const end = Math.min(100, positionOf(event.ended_at ?? now, now, seconds))
    const width = Math.max(MIN_WIDTH, end - x)
    return { event, x: Math.min(x, 100 - width), width, text: describeEvent(event), selected: event.id === selectedId }
  })
  return { markers, older: events.length - visible.length }
}
