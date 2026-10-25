import { describeEvent, formatTime } from '@/lib/format'
import type { EventRow } from '@/types'
import { COVERAGE_GAP, MAX_TICKS, MAX_WINDOW, MIN_WIDTH, MIN_WINDOW, RANGES, TICK_STEPS } from './constants'
import type { Marker, RangeId, Segment, Tick } from './types'

export const secondsOf = (id: RangeId): number => (RANGES.find((r) => r.id === id) ?? RANGES[0]).seconds

/** Le raccourci qui correspond exactement à une fenêtre, ou vide. */
export const presetOf = (seconds: number): RangeId | '' => RANGES.find((r) => r.seconds === seconds)?.id ?? ''

export const clampWindow = (seconds: number): number => Math.min(MAX_WINDOW, Math.max(MIN_WINDOW, Math.round(seconds)))

/** Position d'un instant sur l'axe, en % de la fenêtre [end - seconds, end]. */
export const positionOf = (time: number, end: number, seconds: number): number => ((time - (end - seconds)) / seconds) * 100

/** L'instant à une position de l'axe (0 à 1). */
export const timeAt = (fraction: number, end: number, seconds: number): number => end - seconds + fraction * seconds

/** Le pas de graduation adapté à la fenêtre : le plus petit qui donne au plus MAX_TICKS graduations. */
export const tickStep = (seconds: number): number => TICK_STEPS.find((step) => seconds / step <= MAX_TICKS) ?? TICK_STEPS[TICK_STEPS.length - 1]

const tickLabel = (time: number, step: number): string => {
  const date = new Date(time * 1000)
  if (step >= 86400) return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
  if (step < 60) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Les graduations, alignées sur l'heure locale (heures rondes, ou minuit pour les grands pas). */
export const buildTicks = (seconds: number, end: number): Tick[] => {
  const step = tickStep(seconds)
  const start = end - seconds
  const offset = new Date(end * 1000).getTimezoneOffset() * 60
  const first = Math.ceil((start - offset) / step) * step + offset
  const ticks: Tick[] = []
  for (let time = first; time < end; time += step) {
    const x = positionOf(time, end, seconds)
    if (x > 1 && x < 99) ticks.push({ x, label: tickLabel(time, step) })
  }
  return ticks
}

/** Les événements qui touchent la fenêtre, posés sur l'axe, et le nombre de ceux qui sont plus anciens. */
export const buildMarkers = (events: EventRow[], seconds: number, end: number, selectedId: string): { markers: Marker[]; older: number } => {
  const start = end - seconds
  const visible = events.filter((event) => (event.ended_at ?? end) >= start && event.started_at <= end)
  const markers = [...visible].reverse().map((event) => {
    const x = Math.max(0, positionOf(event.started_at, end, seconds))
    const right = Math.min(100, positionOf(event.ended_at ?? end, end, seconds))
    const real = Math.max(0.01, right - x)
    const width = Math.max(MIN_WIDTH, real)
    return { event, x: Math.min(x, 100 - width), width, scale: width / real, text: describeEvent(event), selected: event.id === selectedId }
  })
  return { markers, older: events.filter((event) => (event.ended_at ?? event.started_at) < start).length }
}

/** Les plages couvertes par des images (instants rapprochés), en % de la fenêtre. */
export const buildCoverage = (times: number[], seconds: number, end: number): Segment[] => {
  const segments: Segment[] = []
  let from = -1
  let to = -1
  const push = () => {
    if (from < 0) return
    const x = Math.max(0, positionOf(from, end, seconds))
    const right = Math.min(100, positionOf(to + COVERAGE_GAP / 2, end, seconds))
    if (right > x) segments.push({ x, width: right - x })
  }
  for (const time of times) {
    if (from < 0 || time - to > COVERAGE_GAP) {
      push()
      from = time
    }
    to = time
  }
  push()
  return segments
}

const formatWindow = (seconds: number): string => {
  if (seconds < 120) return `${seconds} s`
  if (seconds < 7200) return `${Math.round(seconds / 60)} min`
  if (seconds < 2 * 86400) return `${(seconds / 3600).toFixed(seconds % 3600 ? 1 : 0)} h`
  return `${(seconds / 86400).toFixed(seconds % 86400 ? 1 : 0)} j`
}

export const windowText = (seconds: number, end: number): string => `${formatTime(end - seconds)} → ${formatTime(end)} · ${formatWindow(seconds)}`

/** La fenêtre qui met un événement au centre, sa durée occupant une part donnée de l'axe. */
export const focusOn = (event: EventRow, share: number, now: number): { seconds: number; end: number } => {
  const ended = event.ended_at ?? now
  const duration = Math.max(1, ended - event.started_at)
  const seconds = clampWindow(duration / share)
  const end = ended + (seconds - duration) / 2
  return { seconds, end }
}
