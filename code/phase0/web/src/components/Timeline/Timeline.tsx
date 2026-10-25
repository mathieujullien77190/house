import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Timeline as TimelineUI } from '@house/ui'
import { fetchEvents, fetchSnapshotTimes } from '@/lib/api'
import type { EventRow } from '@/types'
import { DRAG_THRESHOLD, EVENT_FOCUS_SHARE, EVENTS_DEBOUNCE_MS, FALLBACK_IMAGE_SECONDS, FOLLOW_EDGE, MAX_FUTURE_SHARE, NOW_ZOOM_SECONDS, PLAY_INTERVAL_MS, RANGES, SNAP_SHARE, WHEEL_FACTOR } from './constants'
import { buildCoverage, buildMarkers, buildTicks, clampWindow, fetchBucket, focusOn, liveEnd, mergeEvents, nearestTime, positionOf, refreshEvery, presetOf, secondsOf, timeAt, windowText } from './helpers'
import type { RangeId, TimelineProps } from './types'

const nowSeconds = () => Math.floor(Date.now() / 1000)

/**
 * La frise des événements d'une caméra : une fenêtre de temps qu'on fait glisser et qu'on zoome (molette,
 * raccourcis, clic sur un événement), un bloc par événement, la couverture en images, un curseur pour voir
 * l'image d'un instant. Ce qu'on choisit (instant ou événement) remonte à la carte de la caméra.
 * Le dessin est celui de @house/ui ; ici, les calculs et les gestes.
 */
const Timeline = ({ apiKey, camera, events: recent, onCursor, onEvent, playhead, clipRange }: TimelineProps) => {
  const [seconds, setSeconds] = useState(NOW_ZOOM_SECONDS)
  const [end, setEnd] = useState(() => liveEnd(nowSeconds(), NOW_ZOOM_SECONDS))
  const [live, setLive] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [cursor, setCursor] = useState<number | null>(null)
  const [times, setTimes] = useState<number[]>([])
  const bucket = fetchBucket(end, seconds)
  // L'instant de la dernière image demandée au parent et l'heure du dernier pas : le curseur avance en temps réel.
  const reported = useRef<number | null>(null)
  const lastStep = useRef(0)
  const [dragging, setDragging] = useState(false)
  // Les événements de la fenêtre (demandés avec from et to : l'historique, pas seulement les 200 derniers) et le nombre de plus anciens.
  const [history, setHistory] = useState<EventRow[]>([])
  const [olderCount, setOlderCount] = useState<number | null>(null)
  const axisRef = useRef<HTMLDivElement>(null)
  // Le glisser en cours : position de départ du pointeur et bord droit au départ.
  const drag = useRef<{ x: number; end: number; moved: boolean } | null>(null)
  // La fenêtre courante, lisible par l'écouteur de molette sans le réinstaller à chaque rendu.
  const view = useRef({ seconds, end })
  useEffect(() => {
    view.current = { seconds, end }
  }, [seconds, end])

  // En direct, le bord droit suit l'heure courante, plus la part de futur.
  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => setEnd(liveEnd(nowSeconds(), seconds)), refreshEvery(seconds))
    return () => clearInterval(timer)
  }, [live, seconds])

  // Les instants couverts par une image, pour la fenêtre affichée (pas pendant un glisser).
  useEffect(() => {
    if (dragging) return
    let cancelled = false
    fetchSnapshotTimes(apiKey, camera, end - seconds, end)
      .then((list) => {
        if (!cancelled) setTimes(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // end change à chaque seconde en direct : seul bucket (la fenêtre a assez avancé) relance la requête.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, camera, bucket, seconds, dragging])

  // Les événements de la fenêtre affichée, demandés à l'API une fois la fenêtre posée (glisser et zoom changent vite).
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      const start = end - seconds
      Promise.all([fetchEvents(apiKey, { camera, from: start, to: end }), fetchEvents(apiKey, { camera, to: start })])
        .then(([inWindow, before]) => {
          if (cancelled) return
          setHistory(inWindow)
          setOlderCount(before.filter((event) => (event.ended_at ?? event.started_at) < start).length)
        })
        .catch(() => undefined)
    }, EVENTS_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, camera, bucket, seconds])
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
  useEffect(() => {
    if (cursor === null || selectedId || dragging) return
    const timer = setTimeout(() => {
      // Le pas se mesure à l'horloge : les temporisations dérivent, le curseur ne doit pas prendre de retard.
      const now = Date.now()
      const next = cursor + Math.max(1, Math.round((now - lastStep.current) / 1000))
      lastStep.current = now
      if (next >= nowSeconds()) {
        setCursor(null)
        onCursor(null)
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
      if (positionOf(next, currentEnd, current) > FOLLOW_EDGE * 100) place(next + current * 0.5, current)
    }, PLAY_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [cursor, selectedId, dragging, onCursor, times])

  // La molette zoome autour de l'instant sous le pointeur. Écouteur non passif : la page ne doit pas défiler.
  useEffect(() => {
    const axis = axisRef.current
    if (!axis) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const { seconds: current, end: currentEnd } = view.current
      const rect = axis.getBoundingClientRect()
      const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / (rect.width || 1)))
      const anchor = timeAt(fraction, currentEnd, current)
      const next = clampWindow(event.deltaY > 0 ? current * WHEEL_FACTOR : current / WHEEL_FACTOR)
      place(anchor + (1 - fraction) * next, next)
    }
    axis.addEventListener('wheel', onWheel, { passive: false })
    return () => axis.removeEventListener('wheel', onWheel)
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

  // Un clic dans un événement : son clip remplace l'image et démarre à l'instant cliqué (fraction du bloc) ;
  // le curseur s'y place puis suit la lecture, et la fenêtre se recale pour que l'événement occupe la moitié de l'axe.
  const chooseEvent = (id: string, fraction = 0) => {
    const event = events.find((e) => e.id === id) ?? null
    const at = event ? Math.round(event.started_at + fraction * ((event.ended_at ?? event.started_at) - event.started_at)) : null
    setSelectedId(event ? id : '')
    onEvent(event, at)
    setCursor(at)
    onCursor(null)
    if (event) {
      const focus = focusOn(event, EVENT_FOCUS_SHARE, nowSeconds())
      place(focus.end, focus.seconds)
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, end, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const dx = event.clientX - drag.current.x
    if (!drag.current.moved && Math.abs(dx) < DRAG_THRESHOLD) return
    drag.current.moved = true
    setDragging(true)
    const width = event.currentTarget.clientWidth || 1
    place(drag.current.end - (dx / width) * seconds)
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const started = drag.current
    drag.current = null
    setDragging(false)
    if (!started || started.moved) return
    // Un simple clic : le curseur se pose à cet instant, l'image correspondante est demandée.
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / (rect.width || 1)))
    // Pas d'image dans le futur : le curseur s'arrête à maintenant.
    chooseCursor(Math.min(nowSeconds(), Math.round(timeAt(fraction, end, seconds))))
  }

  const { markers, older: olderKnown } = buildMarkers(events, seconds, end, selectedId, nowSeconds())
  const older = olderCount ?? olderKnown
  // Pendant la lecture d'un clip, le curseur suit la vidéo.
  const shownCursor = selectedId && playhead !== null ? playhead : cursor
  const nowPosition = positionOf(nowSeconds(), end, seconds)
  const nowX = nowPosition > 0 && nowPosition < 100 ? nowPosition : null
  // L'étendue de la vidéo, bornée à la fenêtre : le clip déborde de l'événement, le curseur la suit jusqu'au bout.
  const spanStart = clipRange ? Math.max(0, positionOf(clipRange.start, end, seconds)) : 0
  const spanEnd = clipRange ? Math.min(100, positionOf(clipRange.end, end, seconds)) : 0
  const clipSpan = selectedId && clipRange && spanEnd > spanStart ? { x: spanStart, width: spanEnd - spanStart } : null
  const cursorX = shownCursor === null ? null : positionOf(shownCursor, end, seconds)

  return (
    <TimelineUI<RangeId>
      ranges={RANGES}
      range={presetOf(seconds)}
      live={live}
      windowText={windowText(seconds, end)}
      ticks={buildTicks(seconds, end)}
      markers={markers.map(({ event, ...marker }) => ({ id: event.id, ...marker }))}
      coverage={buildCoverage(times, seconds, end)}
      nowX={nowX}
      clipSpan={clipSpan}
      cursorX={cursorX !== null && cursorX >= 0 && cursorX <= 100 ? cursorX : null}
      older={older}
      axisRef={axisRef}
      onRange={(id) => {
        place(live ? Infinity : end, secondsOf(id))
      }}
      onNow={() => {
        place(Infinity, NOW_ZOOM_SECONDS)
        chooseCursor(null)
        chooseEvent('')
      }}
      onSelect={chooseEvent}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}

export default Timeline
