// Zoom au doigt sur un média : deux doigts pincent et déplacent, un doigt déplace une image déjà zoomée,
// un double toucher zoome ou revient à la taille normale. Le zoom ne vit que tant que `active` est vrai.
// En portrait, la vue en grand est tournée d'un quart de tour par CSS (`rotated`) : les gestes de l'écran sont ramenés
// dans le repère de l'élément avant tout calcul. Un média qui n'est pas tourné (l'écran fixe du téléphone) garde les gestes tels quels.
import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type PointerEvent } from 'react'

export interface PinchZoom {
  /** À poser sur la zone du média. */
  handlers: HTMLAttributes<HTMLDivElement> & { ref?: (element: HTMLDivElement | null) => void }
  /** À poser sur le contenu qui se déplace et grossit. */
  style: CSSProperties
}

interface View {
  scale: number
  x: number
  y: number
}

interface Point {
  x: number
  y: number
}

/** Ce qui reste fixe pendant un geste : le point du contenu sous les doigts, le zoom et l'écart des doigts au départ. */
interface Anchor {
  content: Point
  scale: number
  distance: number
}

/** Un toucher : où et quand. */
interface Tap extends Point {
  at: number
}

/** L'état du geste en cours, hors du rendu : il change à chaque mouvement de doigt sans rien redessiner. */
interface Gesture {
  anchor: Anchor | null
  tapStart: Tap | null
  lastTap: Tap | null
}

const MAX_SCALE = 6
/** Le zoom d'un cran de molette : e^(-deltaY × WHEEL_SPEED). */
const WHEEL_SPEED = 0.0015
const DOUBLE_TAP_SCALE = 2.5
const DOUBLE_TAP_MS = 300
const TAP_MS = 250
const TAP_MOVE = 10
const IDENTITY: View = { scale: 1, x: 0, y: 0 }

/** Un point de l'écran dans le repère de l'élément (origine au centre), tourné si la vue en grand l'est (`rotated`, en portrait). */
const toLocal = (event: PointerEvent<HTMLDivElement>, rotated: boolean): Point => {
  const rect = event.currentTarget.getBoundingClientRect()
  const dx = event.clientX - (rect.left + rect.width / 2)
  const dy = event.clientY - (rect.top + rect.height / 2)
  return rotated && window.matchMedia('(orientation: portrait)').matches ? { x: dy, y: -dx } : { x: dx, y: dy }
}

const middle = (points: Point[]): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
})

const gap = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

/** Le déplacement ne laisse jamais un bord de l'image entrer dans la zone. */
const limit = (view: View, element: HTMLElement): View => {
  if (view.scale <= 1) return IDENTITY
  const maxX = (element.offsetWidth * (view.scale - 1)) / 2
  const maxY = (element.offsetHeight * (view.scale - 1)) / 2
  return { scale: view.scale, x: Math.min(maxX, Math.max(-maxX, view.x)), y: Math.min(maxY, Math.max(-maxY, view.y)) }
}

/**
 * `active` : le zoom au doigt est permis. `wheel` : la molette zoome aussi, autour du pointeur (bureau). `rotated` : le média est tourné d'un quart de tour en portrait (la vue en grand ; vrai par défaut). `resetKey` : un
 * changement de média (direct, image, autre clip) remet le zoom à zéro.
 */
export const usePinchZoom = (active: boolean, rotated = true, resetKey = '', wheel = false): PinchZoom => {
  // Le zoom vit tant que les doigts ou la molette le permettent.
  const zoomable = active || wheel
  const [view, setView] = useState<View>(IDENTITY)
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setView(IDENTITY)
  }
  const [pointers] = useState(() => new Map<number, Point>())
  const gestureRef = useRef<Gesture>({ anchor: null, tapStart: null, lastTap: null })

  // La vue en grand se ferme : le zoom repart de zéro.
  if (!zoomable && view !== IDENTITY) setView(IDENTITY)
  // Et les doigts oubliés (posés pendant la fermeture) ne faussent pas le prochain geste.
  useEffect(() => {
    if (active) return
    pointers.clear()
    gestureRef.current = { anchor: null, tapStart: null, lastTap: null }
  }, [active, pointers])

  // La molette : zoome autour du pointeur. Écouteur natif non passif, sinon la page défile en même temps.
  const [zone, setZone] = useState<HTMLDivElement | null>(null)
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  })
  useEffect(() => {
    if (!wheel || !zone) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = zone.getBoundingClientRect()
      const point = { x: event.clientX - (rect.left + rect.width / 2), y: event.clientY - (rect.top + rect.height / 2) }
      const current = viewRef.current
      const scale = Math.min(MAX_SCALE, Math.max(1, current.scale * Math.exp(-event.deltaY * WHEEL_SPEED)))
      const content = { x: (point.x - current.x) / current.scale, y: (point.y - current.y) / current.scale }
      setView(limit({ scale, x: point.x - content.x * scale, y: point.y - content.y * scale }, zone))
    }
    zone.addEventListener('wheel', onWheel, { passive: false })
    return () => zone.removeEventListener('wheel', onWheel)
  }, [wheel, zone])

  // Au bureau, hors vue en grand (molette sans doigts) : une image zoomée se déplace à la souris. Le glisser ne démarre qu'après quelques pixels, pour que
  // les clics sur les commandes de la vidéo passent ; le clic qui finit un glisser est avalé.
  const dragRef = useRef<{ id: number; x: number; y: number; from: View; moved: boolean } | null>(null)
  const mouseDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || view.scale <= 1) return
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: view, moved: false }
  }
  const mouseMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < TAP_MOVE / 2) return
      drag.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setView(limit({ scale: drag.from.scale, x: drag.from.x + dx, y: drag.from.y + dy }, event.currentTarget))
  }
  const mouseUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag?.id !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    // Le clic qui suit le relâchement d'un vrai glisser n'en est pas un.
    if (drag.moved) {
      const swallow = (click: Event) => click.stopPropagation()
      window.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
    }
    dragRef.current = null
  }

  // Les doigts ont changé : le geste repart de là où ils sont, sans saut.
  const begin = () => {
    const gesture = gestureRef.current
    const points = [...pointers.values()]
    if (points.length === 0) {
      gesture.anchor = null
      return
    }
    const mid = middle(points)
    const [a, b] = points
    gesture.anchor = {
      content: { x: (mid.x - view.x) / view.scale, y: (mid.y - view.y) / view.scale },
      scale: view.scale,
      distance: a && b ? gap(a, b) : 0,
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointers.set(event.pointerId, toLocal(event, rotated))
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // sans capture, le geste continue tant que le doigt reste sur la zone
    }
    gestureRef.current.tapStart = pointers.size === 1 ? { ...toLocal(event, rotated), at: Date.now() } : null
    begin()
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, toLocal(event, rotated))
    const { anchor } = gestureRef.current
    // Garde défensive : un pointeur suivi a toujours une ancre (begin() la pose à chaque changement de doigts) ; inatteignable.
    /* v8 ignore next */
    if (!anchor) return
    const points = [...pointers.values()]
    const [a, b] = points
    let scale = anchor.scale
    if (a && b && anchor.distance > 0) scale = Math.min(MAX_SCALE, Math.max(1, (anchor.scale * gap(a, b)) / anchor.distance))
    else if (anchor.scale === 1) return
    const mid = middle(points)
    setView(limit({ scale, x: mid.x - anchor.content.x * scale, y: mid.y - anchor.content.y * scale }, event.currentTarget))
  }

  const release = (event: PointerEvent<HTMLDivElement>, canTap: boolean) => {
    const point = toLocal(event, rotated)
    pointers.delete(event.pointerId)
    const gesture = gestureRef.current
    const { tapStart, lastTap } = gesture
    gesture.tapStart = null
    const tapped =
      canTap && tapStart !== null && pointers.size === 0 && Date.now() - tapStart.at < TAP_MS && gap(point, tapStart) < TAP_MOVE
    if (tapped && lastTap && Date.now() - lastTap.at < DOUBLE_TAP_MS && gap(point, lastTap) < 4 * TAP_MOVE) {
      // Double toucher : retour à la taille normale, ou zoom sur le point touché.
      gesture.lastTap = null
      pointers.clear()
      gesture.anchor = null
      setView(
        view.scale > 1
          ? IDENTITY
          : limit(
              { scale: DOUBLE_TAP_SCALE, x: point.x * (1 - DOUBLE_TAP_SCALE), y: point.y * (1 - DOUBLE_TAP_SCALE) },
              event.currentTarget,
            ),
      )
      return
    }
    gesture.lastTap = tapped ? { ...point, at: Date.now() } : null
    begin()
  }

  return {
    handlers: {
      ref: setZone,
      // Sans cela le navigateur emporte l'image en glisser-déposer et coupe le glisser à la souris.
      onDragStart: (event) => event.preventDefault(),
      ...(active
        ? {
            onPointerDown,
            onPointerMove,
            onPointerUp: (event: PointerEvent<HTMLDivElement>) => release(event, true),
            onPointerCancel: (event: PointerEvent<HTMLDivElement>) => release(event, false),
          }
        : wheel
          ? { onPointerDown: mouseDown, onPointerMove: mouseMove, onPointerUp: mouseUp, onPointerCancel: mouseUp }
          : {}),
    },
    style: {
      transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
      transformOrigin: 'center',
      ...(wheel && !active && view.scale > 1 ? { cursor: 'grab' } : {}),
    },
  }
}
