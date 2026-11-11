import type { TimelineSegment, TimelineTick } from '@house/ui'
import { describeEvent } from '@/lib/format'
import type { EventRow } from '@/types'
import {
  COVERAGE_GAP,
  FUTURE_SHARE,
  MARKER_LEAD_SECONDS,
  MARKER_TAIL_SECONDS,
  MAX_REFRESH_MS,
  MAX_TICKS,
  MAX_WINDOW,
  MIN_REFETCH_SECONDS,
  MIN_REFRESH_MS,
  MIN_TICKS,
  REFETCH_DIVISOR,
  MIN_WIDTH,
  MIN_WINDOW,
  RANGES,
  TICK_MIN_PX,
  TICK_MIN_PX_VERTICAL,
  TICK_STEPS,
} from './constants'
import type { Marker, RangeId } from './types'

export const secondsOf = (id: RangeId): number => (RANGES.find((r) => r.id === id) ?? RANGES[0]).seconds

/** Le raccourci qui correspond exactement à une fenêtre, ou vide. */
export const presetOf = (seconds: number): RangeId | '' => RANGES.find((r) => r.seconds === seconds)?.id ?? ''

export const clampWindow = (seconds: number): number => Math.min(MAX_WINDOW, Math.max(MIN_WINDOW, Math.round(seconds)))

/** Le rythme (ms) auquel la fenêtre en direct avance : environ 120 pas par fenêtre, entre 1 s et 1 min. */
export const refreshEvery = (seconds: number): number => Math.min(MAX_REFRESH_MS, Math.max(MIN_REFRESH_MS, (seconds * 1000) / 120))

/** Le bord droit de la fenêtre en direct : maintenant, plus la part de futur. */
export const liveEnd = (now: number, seconds: number): number => now + Math.round(seconds * FUTURE_SHARE)

/** Position d'un instant sur l'axe, en % de la fenêtre [end - seconds, end]. */
export const positionOf = (time: number, end: number, seconds: number): number => ((time - (end - seconds)) / seconds) * 100

/** L'instant à une position de l'axe (0 à 1). */
export const timeAt = (fraction: number, end: number, seconds: number): number => end - seconds + fraction * seconds

/**
 * Un numéro qui change quand la fenêtre a assez avancé pour justifier de redemander images gardées et événements :
 * le bord droit d'une fenêtre en direct bouge à chaque seconde, les requêtes n'ont pas à suivre.
 */
export const fetchBucket = (end: number, seconds: number): number =>
  Math.floor(end / Math.max(MIN_REFETCH_SECONDS, seconds / REFETCH_DIVISOR))

/** L'image gardée la plus proche d'un instant (secondes), ou null s'il n'y en a aucune. */
export const nearestTime = (times: number[], at: number): number | null =>
  times.reduce<number | null>((best, time) => (best === null || Math.abs(time - at) < Math.abs(best - at) ? time : best), null)

/** Le nombre de graduations que porte un axe de cette largeur (en pixels) ; MAX_TICKS tant que la largeur est inconnue (0). */
export const maxTicksFor = (axisLength: number, vertical = false): number =>
  axisLength > 0
    ? Math.min(MAX_TICKS, Math.max(MIN_TICKS, Math.floor(axisLength / (vertical ? TICK_MIN_PX_VERTICAL : TICK_MIN_PX))))
    : MAX_TICKS

/** Le pas de graduation adapté à la fenêtre : le plus petit qui donne au plus `maxTicks` graduations. */
export const tickStep = (seconds: number, maxTicks = MAX_TICKS): number =>
  TICK_STEPS.find((step) => seconds / step <= maxTicks) ?? TICK_STEPS[TICK_STEPS.length - 1]

const tickLabel = (time: number, step: number): string => {
  const date = new Date(time * 1000)
  if (step >= 86400) return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
  if (step < 60) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Les graduations, alignées sur l'heure locale (heures rondes, ou minuit pour les grands pas). */
export const buildTicks = (seconds: number, end: number, maxTicks = MAX_TICKS): TimelineTick[] => {
  const step = tickStep(seconds, maxTicks)
  const start = end - seconds
  const offset = new Date(end * 1000).getTimezoneOffset() * 60
  const first = Math.ceil((start - offset) / step) * step + offset
  const ticks: TimelineTick[] = []
  for (let time = first; time < end; time += step) {
    const x = positionOf(time, end, seconds)
    if (x > 1 && x < 99) ticks.push({ x, label: tickLabel(time, step) })
  }
  return ticks
}

/** Réunit les événements récents (à jour : en cours, fraîchement finis) et ceux demandés pour la fenêtre, plus récents d'abord. */
export const mergeEvents = (recent: EventRow[], history: EventRow[]): EventRow[] => {
  const byId = new Map<string, EventRow>()
  for (const event of history) byId.set(event.id, event)
  for (const event of recent) byId.set(event.id, event)
  return [...byId.values()].sort((a, b) => b.started_at - a.started_at)
}

/** Les événements qui touchent la fenêtre, posés sur l'axe, et le nombre de ceux qui sont plus anciens. */
export const buildMarkers = (events: EventRow[], seconds: number, end: number, selectedId: string, now: number): { markers: Marker[] } => {
  const start = end - seconds
  // Un événement en cours s'arrête à maintenant, jamais dans le futur.
  const until = Math.min(end, now)
  // Le bloc couvre tout le clip, même là où rien ne bouge : du début réel de la vidéo (ou 5 s avant le mouvement) à un peu après la fin.
  const spanOf = (event: EventRow): [number, number] => [
    event.clip_started_at ?? event.started_at - MARKER_LEAD_SECONDS,
    event.ended_at === null ? until : Math.min(until + MARKER_TAIL_SECONDS, event.ended_at + MARKER_TAIL_SECONDS),
  ]
  const visible = events.filter((event) => spanOf(event)[1] >= start && spanOf(event)[0] <= end)
  const markers = [...visible].reverse().map((event) => {
    const [from, to] = spanOf(event)
    const x = Math.max(0, positionOf(from, end, seconds))
    const right = Math.min(100, positionOf(to, end, seconds))
    const real = Math.max(0.01, right - x)
    const width = Math.max(MIN_WIDTH, real)
    return {
      event,
      x: Math.min(x, 100 - width),
      width,
      text: describeEvent(event),
      selected: event.id === selectedId,
      ongoing: event.ended_at === null,
    }
  })
  return { markers }
}

/** Les plages couvertes par des images (instants rapprochés), en % de la fenêtre. */
export const buildCoverage = (times: number[], seconds: number, end: number): TimelineSegment[] => {
  const segments: TimelineSegment[] = []
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

/**
 * La fenêtre qui met un événement au centre : **tout son bloc bleu** (du début réel de la vidéo à un peu après la fin, comme `buildMarkers`) occupe la part donnée de l'axe,
 * pour que le clip entier se voie.
 */
export const focusOn = (event: EventRow, share: number, now: number): { seconds: number; end: number } => {
  const from = event.clip_started_at ?? event.started_at - MARKER_LEAD_SECONDS
  const to = event.ended_at === null ? now : event.ended_at + MARKER_TAIL_SECONDS
  const duration = Math.max(1, to - from)
  const seconds = clampWindow(duration / share)
  const end = to + (seconds - duration) / 2
  return { seconds, end }
}

/** La coordonnée du pointeur le long de l'axe : x sur l'axe horizontal, y sur l'axe vertical. */
export const alongOf = (point: { clientX: number; clientY: number }, vertical: boolean): number =>
  vertical ? point.clientY : point.clientX

/**
 * La place d'une coordonnée sur l'axe, de 0 (instant le plus ancien) à 1 (le plus récent). L'axe horizontal a le plus
 * ancien à gauche ; l'axe vertical (téléphone) a le plus récent en haut.
 */
export const fractionAlong = (coordinate: number, rect: DOMRect, vertical: boolean): number => {
  const raw = vertical ? 1 - (coordinate - rect.top) / (rect.height || 1) : (coordinate - rect.left) / (rect.width || 1)
  return Math.min(1, Math.max(0, raw))
}

/** La longueur de l'axe en pixels : sa largeur, ou sa hauteur quand il est vertical. */
export const axisLength = (axis: { clientWidth: number; clientHeight: number }, vertical: boolean): number =>
  vertical ? axis.clientHeight : axis.clientWidth

/**
 * De combien de secondes la fenêtre se décale quand le doigt glisse de `delta` pixels sur un axe de `length` pixels. Le
 * contenu suit le doigt : vers la droite on découvre le passé (horizontal) ; vers le bas on découvre le plus récent
 * (vertical, le plus récent en haut).
 */
export const shiftSeconds = (delta: number, length: number, seconds: number, vertical: boolean): number =>
  (vertical ? 1 : -1) * (delta / (length || 1)) * seconds
