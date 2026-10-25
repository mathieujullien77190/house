import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { fetchSnapshotTimes } from '@/lib/api'
import TimelineUI from './UI'
import { DEFAULT_RANGE, DRAG_THRESHOLD, EVENT_FOCUS_SHARE, NOW_REFRESH_MS, RANGES, WHEEL_FACTOR } from './constants'
import { buildCoverage, buildMarkers, buildTicks, clampWindow, focusOn, positionOf, presetOf, secondsOf, timeAt, windowText } from './helpers'
import type { RangeId, TimelineProps } from './types'

const nowSeconds = () => Math.floor(Date.now() / 1000)

/**
 * La frise des événements d'une caméra : une fenêtre de temps qu'on fait glisser et qu'on zoome (molette,
 * raccourcis, clic sur un événement), un bloc par événement, la couverture en images, un curseur pour voir
 * l'image d'un instant. Ce qu'on choisit (instant ou événement) remonte à la carte de la caméra.
 */
const Timeline = ({ apiKey, camera, events, onCursor, onEvent, playhead }: TimelineProps) => {
  const [seconds, setSeconds] = useState(() => secondsOf(DEFAULT_RANGE))
  const [end, setEnd] = useState(nowSeconds)
  const [live, setLive] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [cursor, setCursor] = useState<number | null>(null)
  const [times, setTimes] = useState<number[]>([])
  const [dragging, setDragging] = useState(false)
  const axisRef = useRef<HTMLDivElement>(null)
  // Le glisser en cours : position de départ du pointeur et bord droit au départ.
  const drag = useRef<{ x: number; end: number; moved: boolean } | null>(null)
  // La fenêtre courante, lisible par l'écouteur de molette sans le réinstaller à chaque rendu.
  const view = useRef({ seconds, end })
  useEffect(() => {
    view.current = { seconds, end }
  }, [seconds, end])

  // En direct, le bord droit suit l'heure courante (moveTo l'a déjà posé sur « maintenant »).
  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => setEnd(nowSeconds()), NOW_REFRESH_MS)
    return () => clearInterval(timer)
  }, [live])

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
  }, [apiKey, camera, end, seconds, dragging])

  // Place la fenêtre [nextEnd - nextSeconds, nextEnd] sans jamais dépasser maintenant.
  const place = (nextEnd: number, nextSeconds = view.current.seconds) => {
    const now = nowSeconds()
    setSeconds(nextSeconds)
    if (nextEnd >= now) {
      setLive(true)
      setEnd(now)
    } else {
      setLive(false)
      setEnd(Math.round(nextEnd))
    }
  }

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
    chooseCursor(Math.round(timeAt(fraction, end, seconds)))
  }

  const { markers, older } = buildMarkers(events, seconds, end, selectedId)
  // Pendant la lecture d'un clip, le curseur suit la vidéo.
  const shownCursor = selectedId && playhead !== null ? playhead : cursor
  const cursorX = shownCursor === null ? null : positionOf(shownCursor, end, seconds)

  return (
    <TimelineUI
      ranges={RANGES}
      range={presetOf(seconds)}
      live={live}
      windowText={windowText(seconds, end)}
      ticks={buildTicks(seconds, end)}
      markers={markers}
      coverage={buildCoverage(times, seconds, end)}
      cursorX={cursorX !== null && cursorX >= 0 && cursorX <= 100 ? cursorX : null}
      older={older}
      axisRef={axisRef}
      onRange={(id: RangeId | '') => {
        if (id) place(live ? nowSeconds() : end, secondsOf(id))
      }}
      onEarlier={() => place(end - seconds / 2)}
      onLater={() => place(end + seconds / 2)}
      onNow={() => {
        place(nowSeconds())
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
