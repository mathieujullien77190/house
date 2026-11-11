import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Timeline as TimelineUI } from '@house/ui'
import { fetchEvents, fetchSnapshotTimes } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { useDebounced } from '@/lib/useDebounced'
import { useMobile } from '@/lib/useMobile'
import type { EventRow } from '@/types'
import {
  DRAG_THRESHOLD,
  EVENT_FOCUS_SHARE,
  EVENTS_DEBOUNCE_MS,
  FALLBACK_IMAGE_SECONDS,
  FAST_TICK_MS,
  FOLLOW_EDGE,
  MAX_FUTURE_SHARE,
  NOW_ZOOM_SECONDS,
  PLAY_INTERVAL_MS,
  RANGES,
  SNAP_SHARE,
  WHEEL_FACTOR,
} from './constants'
import {
  alongOf,
  axisLength,
  buildCoverage,
  buildMarkers,
  buildTicks,
  clampWindow,
  fractionAlong,
  fetchBucket,
  focusOn,
  liveEnd,
  maxTicksFor,
  mergeEvents,
  nearestTime,
  positionOf,
  refreshEvery,
  presetOf,
  secondsOf,
  shiftSeconds,
  timeAt,
} from './helpers'
import type { RangeId, TimelineProps } from './types'

const nowSeconds = () => Math.floor(Date.now() / 1000)

// Des listes vides toujours identiques : tant qu'il n'y a pas de réponse, les effets qui en dépendent ne repartent pas à chaque rendu.
const NO_TIMES: number[] = []
const NO_EVENTS: EventRow[] = []

/**
 * La frise des événements d'une caméra : une fenêtre de temps qu'on fait glisser et qu'on zoome (molette,
 * raccourcis, clic sur un événement), un bloc par événement, la couverture en images, un curseur pour voir
 * l'image d'un instant. Ce qu'on choisit (instant ou événement) remonte à la carte de la caméra.
 * Le dessin est celui de @house/ui ; ici, les calculs et les gestes.
 */
const Timeline = ({
  apiKey,
  camera,
  events: recent,
  onCursor,
  onEvent,
  playhead,
  selectedEventId,
  fill = false,
  rate = 1,
  controls,
  initialCursor,
  stepRef,
}: TimelineProps) => {
  // Sur téléphone (sous 1024 px) la frise est verticale, le plus récent en haut ; sur grand écran, horizontale.
  const vertical = useMobile()
  const [seconds, setSeconds] = useState(NOW_ZOOM_SECONDS)
  // Un instant de départ (ouvert depuis l'image d'une autre caméra) : la fenêtre le contient, centré si c'est loin du direct.
  const pastStart =
    initialCursor !== undefined && initialCursor <= liveEnd(nowSeconds(), NOW_ZOOM_SECONDS) - NOW_ZOOM_SECONDS ? initialCursor : null
  const startsLive = pastStart === null
  const [end, setEnd] = useState(() =>
    pastStart === null ? liveEnd(nowSeconds(), NOW_ZOOM_SECONDS) : Math.round(pastStart + NOW_ZOOM_SECONDS / 2),
  )
  const [live, setLive] = useState(startsLive)
  const [selectedId, setSelectedId] = useState('')
  // La carte a fermé l'événement (bouton « Fermer » du lecteur) : la sélection de la frise suit, sinon le curseur resterait figé.
  if (selectedEventId === '' && selectedId !== '') setSelectedId('')
  // Le clip ouvert reste choisi dans la frise (un reclic sur son bloc ne le désélectionne pas).
  if (selectedEventId && selectedId !== selectedEventId) setSelectedId(selectedEventId)
  const [cursor, setCursor] = useState<number | null>(initialCursor ?? null)
  const bucket = fetchBucket(end, seconds)
  // L'instant de la dernière image demandée au parent et l'heure du dernier pas : le curseur avance en temps réel.
  const reported = useRef<number | null>(initialCursor ?? null)
  const lastStep = useRef(0)
  const [dragging, setDragging] = useState(false)
  // Les événements de la fenêtre (demandés avec from et to : l'historique, pas seulement les 200 derniers) et le nombre de plus anciens.
  const axisRef = useRef<HTMLDivElement>(null)
  // La longueur de l'axe (largeur, ou hauteur s'il est vertical) : une frise courte porte moins de graduations.
  const [axisSize, setAxisSize] = useState(0)
  // Le glisser en cours : position de départ du pointeur (le long de l'axe) et bord récent de la fenêtre au départ.
  const drag = useRef<{ x: number; end: number; moved: boolean } | null>(null)
  // Les doigts posés sur l'axe (identifiant → position le long de l'axe) et le pincement en cours : l'écart des doigts au départ, la
  // largeur de la fenêtre et l'instant sous le milieu des doigts, qui reste sous eux pendant qu'on zoome.
  const pointers = useRef(new Map<number, number>())
  const pinch = useRef<{ distance: number; seconds: number; anchor: number } | null>(null)
  // Après un pincement, le doigt qui reste posé ne déplace ni ne clique : il faut tout relever avant de reprendre.
  const gestureDone = useRef(false)
  // La fenêtre courante, lisible par l'écouteur de molette sans le réinstaller à chaque rendu.
  const view = useRef({ seconds, end })

  // Suit la longueur de l'axe (rotation du téléphone, fenêtre redimensionnée).
  useEffect(() => {
    const axis = axisRef.current
    if (!axis) return
    const update = () => setAxisSize(axisLength(axis, vertical))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(axis)
    return () => observer.disconnect()
  }, [vertical])
  useEffect(() => {
    view.current = { seconds, end }
  }, [seconds, end])

  // En direct, le bord droit suit l'heure courante, plus la part de futur.
  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => setEnd(liveEnd(nowSeconds(), seconds)), refreshEvery(seconds))
    return () => clearInterval(timer)
  }, [live, seconds])

  // Les instants couverts par une image, pour la fenêtre affichée (pas pendant un glisser). TanStack Query : une fenêtre déjà vue revient du cache, et l'ancienne reste
  // affichée pendant qu'une nouvelle arrive. `bucket` change quand la fenêtre a assez avancé (en direct, `end` change à chaque seconde).
  const { data: times = NO_TIMES } = useQuery(
    {
      queryKey: ['snapshot-times', camera, bucket, seconds],
      queryFn: () => fetchSnapshotTimes(apiKey, camera, end - seconds, end),
      enabled: !dragging,
      placeholderData: keepPreviousData,
    },
    queryClient,
  )

  // Les événements de la fenêtre affichée, demandés à l'API une fois la fenêtre posée (glisser et zoom changent vite : on attend `EVENTS_DEBOUNCE_MS` de calme).
  const eventsWindow = useDebounced(`${bucket}:${seconds}`, EVENTS_DEBOUNCE_MS)
  const { data: history = NO_EVENTS } = useQuery(
    {
      queryKey: ['events', camera, eventsWindow],
      queryFn: () => fetchEvents(apiKey, { camera, from: end - seconds, to: end }),
      placeholderData: keepPreviousData,
    },
    queryClient,
  )
  const events = mergeEvents(recent, history)

  // Place la fenêtre [nextEnd - nextSeconds, nextEnd]. Le futur se découvre en glissant, jusqu'à centrer « maintenant » ;
  // près du bord en direct la fenêtre s'y accroche et se remet à suivre l'heure (Infinity y va directement).
  const place = (nextEnd: number, nextSeconds = view.current.seconds) => {
    const now = nowSeconds()
    const home = liveEnd(now, nextSeconds)
    const farthest = now + Math.round(nextSeconds * MAX_FUTURE_SHARE)
    setSeconds(nextSeconds)
    if (Math.abs(nextEnd - home) <= nextSeconds * SNAP_SHARE || nextEnd === Infinity) {
      setLive(true)
      setEnd(home)
    } else {
      setLive(false)
      setEnd(Math.round(Math.min(nextEnd, farthest)))
    }
  }

  // Le curseur posé sur l'axe avance tout seul, en temps réel (une minute dure une minute), jusqu'à maintenant, où
  // l'on retrouve le direct. L'image ne change qu'à chaque image gardée (une par minute). Il s'arrête pendant un
  // glisser et quand un événement est ouvert.
  // `rate` : la vitesse du curseur, en secondes de frise par seconde réelle (1 : temps réel ; négatif : il recule). Au-delà du temps réel il se met à jour plus souvent.
  useEffect(() => {
    if (cursor === null || selectedId || dragging) return
    // Vitesse 0 : le temps est arrêté, le curseur reste ; à la reprise, le pas repart de maintenant (pas de saut).
    if (rate === 0) {
      lastStep.current = Date.now()
      return
    }
    // Ouverte sur un instant (depuis l'image d'une autre caméra), la frise n'a jamais fait de pas : l'horloge du pas part de maintenant, sinon le premier pas serait énorme et renverrait au direct.
    if (lastStep.current === 0) lastStep.current = Date.now()
    const timer = setTimeout(
      () => {
        // Le pas se mesure à l'horloge : les temporisations dérivent, le curseur ne doit pas prendre de retard.
        const now = Date.now()
        const move = Math.round((rate * (now - lastStep.current)) / 1000)
        const next = cursor + move
        lastStep.current = now
        if (next >= nowSeconds()) {
          setCursor(null)
          onCursor(null)
          return
        }
        // En reculant, on s'arrête à la plus ancienne image gardée.
        const oldest = times[0]
        if (rate < 0 && oldest !== undefined && next < oldest - FALLBACK_IMAGE_SECONDS) {
          setCursor(oldest)
          return
        }
        setCursor(next)
        const shot = nearestTime(times, next)
        const wanted = shot ?? (reported.current === null || next - reported.current >= FALLBACK_IMAGE_SECONDS ? next : reported.current)
        if (wanted !== reported.current) {
          reported.current = wanted
          onCursor(wanted)
        }
        const { seconds: current, end: currentEnd } = view.current
        const position = positionOf(next, currentEnd, current)
        if (position > FOLLOW_EDGE * 100 || (rate < 0 && position < 100 - FOLLOW_EDGE * 100)) place(next + current * 0.5, current)
      },
      Math.abs(rate) > 1 ? FAST_TICK_MS : PLAY_INTERVAL_MS,
    )
    return () => clearTimeout(timer)
  }, [cursor, selectedId, dragging, onCursor, times, rate])

  // Un pas d'une image (les boutons de la vitesse 0, donnés par le parent) : le curseur saute à l'image gardée juste avant ou juste après lui, la fenêtre le suit s'il sort.
  const stepBy = (direction: -1 | 1) => {
    if (cursor === null) return
    const target = direction > 0 ? times.find((time) => time > cursor) : [...times].reverse().find((time) => time < cursor)
    if (target === undefined) return
    setCursor(target)
    reported.current = target
    lastStep.current = Date.now()
    onCursor(target)
    const { seconds: current, end: currentEnd } = view.current
    const position = positionOf(target, currentEnd, current)
    if (position > FOLLOW_EDGE * 100 || position < 100 - FOLLOW_EDGE * 100) place(target + current * 0.5, current)
  }
  useEffect(() => {
    if (stepRef) stepRef.current = stepBy
  })

  // La molette zoome autour de l'instant sous le pointeur. Écouteur non passif : la page ne doit pas défiler.
  useEffect(() => {
    const axis = axisRef.current
    if (!axis) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const { seconds: current, end: currentEnd } = view.current
      const fraction = fractionAlong(alongOf(event, vertical), axis.getBoundingClientRect(), vertical)
      const anchor = timeAt(fraction, currentEnd, current)
      const next = clampWindow(event.deltaY > 0 ? current * WHEEL_FACTOR : current / WHEEL_FACTOR)
      place(anchor + (1 - fraction) * next, next)
    }
    axis.addEventListener('wheel', onWheel, { passive: false })
    return () => axis.removeEventListener('wheel', onWheel)
  }, [vertical])

  // Caméra ouverte directement sur un événement (clic sur la ligne du dernier clip dans la mosaïque) : la fenêtre se recale sur lui, comme après un clic sur son bloc.
  useEffect(() => {
    const event = recent.find((e) => e.id === selectedEventId)
    if (!event) return
    const focus = focusOn(event, EVENT_FOCUS_SHARE, nowSeconds())
    place(focus.end, focus.seconds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Un clic sur l'axe : le curseur s'y pose, l'image de cet instant est demandée, l'événement ouvert se ferme.
  const chooseCursor = (time: number | null) => {
    setCursor(time)
    reported.current = time
    lastStep.current = Date.now()
    onCursor(time)
    if (selectedId) {
      setSelectedId('')
      onEvent(null, null)
    }
  }

  // Un clic dans un événement : son clip remplace l'image et repart du début de la vidéo, où qu'on clique ;
  // le curseur s'y place puis suit la lecture, et la fenêtre se recale pour que l'événement occupe la moitié de l'axe.
  const chooseEvent = (id: string) => {
    const event = events.find((e) => e.id === id) ?? null
    // Un clic sur un événement lit son clip depuis le début de la vidéo : le curseur se place là, pas à l'endroit cliqué.
    const at = event ? (event.clip_started_at ?? event.started_at) : null
    // Reclic sur le clip déjà ouvert : il repart du début, rien d'autre ne change (ni la fenêtre, ni l'image).
    if (event && id === selectedId) {
      lastStep.current = nowSeconds() * 1000
      onEvent(event, at)
      return
    }
    setSelectedId(event ? id : '')
    lastStep.current = nowSeconds() * 1000
    onEvent(event, at)
    setCursor(at)
    onCursor(null)
    if (event) {
      const focus = focusOn(event, EVENT_FOCUS_SHARE, nowSeconds())
      place(focus.end, focus.seconds)
    }
  }

  // L'écart entre les deux premiers doigts (au moins 1 px) et la place de leur milieu sur l'axe (de 0 à 1).
  const fingers = (axis: HTMLDivElement): { distance: number; fraction: number } => {
    const [a = 0, b = 0] = [...pointers.current.values()]
    return { distance: Math.max(1, Math.abs(a - b)), fraction: fractionAlong((a + b) / 2, axis.getBoundingClientRect(), vertical) }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, alongOf(event, vertical))
    try {
      // Les doigts restent suivis même s'ils sortent de l'axe ; un pointeur déjà fini ne peut plus être capturé.
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // sans capture, le geste continue tant que le pointeur reste sur l'axe
    }
    if (pointers.current.size >= 2) {
      // Un deuxième doigt : le glisser s'arrête, le pincement commence.
      const { distance, fraction } = fingers(event.currentTarget)
      const { seconds: current, end: currentEnd } = view.current
      pinch.current = { distance, seconds: current, anchor: timeAt(fraction, currentEnd, current) }
      gestureDone.current = true
      drag.current = null
      setDragging(true)
      return
    }
    gestureDone.current = false
    drag.current = { x: alongOf(event, vertical), end, moved: false }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, alongOf(event, vertical))
    if (pinch.current && pointers.current.size >= 2) {
      // Les doigts s'écartent : la fenêtre se resserre ; l'instant de départ reste sous le milieu des doigts, qui peut aussi se déplacer.
      const { distance, fraction } = fingers(event.currentTarget)
      const next = clampWindow((pinch.current.seconds * pinch.current.distance) / distance)
      place(pinch.current.anchor + (1 - fraction) * next, next)
      return
    }
    if (!drag.current) return
    const delta = alongOf(event, vertical) - drag.current.x
    if (!drag.current.moved && Math.abs(delta) < DRAG_THRESHOLD) return
    drag.current.moved = true
    setDragging(true)
    place(drag.current.end + shiftSeconds(delta, axisLength(event.currentTarget, vertical), seconds, vertical))
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const started = drag.current
    drag.current = null
    if (gestureDone.current) {
      // Fin d'un pincement : ni clic ni glisser tant qu'il reste un doigt posé.
      if (pointers.current.size === 0) {
        gestureDone.current = false
        setDragging(false)
      }
      return
    }
    setDragging(false)
    if (!started || started.moved) return
    // Un simple clic : le curseur se pose à cet instant, l'image correspondante est demandée.
    const fraction = fractionAlong(alongOf(event, vertical), event.currentTarget.getBoundingClientRect(), vertical)
    // Pas d'image dans le futur : le curseur s'arrête à maintenant.
    chooseCursor(Math.min(nowSeconds(), Math.round(timeAt(fraction, end, seconds))))
  }

  const { markers } = buildMarkers(events, seconds, end, selectedId, nowSeconds())
  // Pendant la lecture d'un clip, le curseur suit la vidéo.
  const shownCursor = selectedId && playhead !== null ? playhead : cursor
  const nowPosition = positionOf(nowSeconds(), end, seconds)
  const nowX = nowPosition > 0 && nowPosition < 100 ? nowPosition : null
  const cursorX = shownCursor === null ? null : positionOf(shownCursor, end, seconds)

  return (
    <TimelineUI<RangeId>
      vertical={vertical}
      fill={fill}
      extra={controls}
      ranges={RANGES}
      range={presetOf(seconds)}
      live={live}
      ticks={buildTicks(seconds, end, maxTicksFor(axisSize, vertical))}
      markers={markers.map(({ event, ...marker }) => ({ id: event.id, ...marker }))}
      coverage={buildCoverage(times, seconds, end)}
      nowX={nowX}
      clipSpan={null}
      cursorX={cursorX !== null && cursorX >= 0 && cursorX <= 100 ? cursorX : null}
      axisRef={axisRef}
      onRange={(id) => {
        place(live ? Infinity : end, secondsOf(id))
      }}
      onNow={() => {
        place(Infinity, NOW_ZOOM_SECONDS)
        chooseCursor(null)
        chooseEvent('')
      }}
      onSelect={(id) => chooseEvent(id)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}

export default Timeline
