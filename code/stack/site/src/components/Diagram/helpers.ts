import type { KeyboardEvent, PointerEvent } from 'react'
import { BASE_WIDTH, BIG_STEP, STEP, ZOOM_MAX, ZOOM_MIN } from './constants'

export interface Point {
  x: number
  y: number
}

/** Convertit la position d'un événement souris en coordonnées du schéma. */
export const toSvgPoint = (svg: SVGSVGElement | null, e: PointerEvent): Point => {
  const ctm = svg?.getScreenCTM()
  if (!svg || !ctm) return { x: 0, y: 0 }
  const p = svg.createSVGPoint()
  p.x = e.clientX
  p.y = e.clientY
  const r = p.matrixTransform(ctm.inverse())
  return { x: r.x, y: r.y }
}

/** Déplacement demandé par une flèche du clavier (Maj = grand pas), ou null. */
export const keyDelta = (e: KeyboardEvent): Point | null => {
  const step = e.shiftKey ? BIG_STEP : STEP
  switch (e.key) {
    case 'ArrowLeft': return { x: -step, y: 0 }
    case 'ArrowRight': return { x: step, y: 0 }
    case 'ArrowUp': return { x: 0, y: -step }
    case 'ArrowDown': return { x: 0, y: step }
    default: return null
  }
}

export const clampZoom = (zoom: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))

export const zoomLabel = (zoom: number): string => `${Math.round(zoom * 100)} %`

/** Largeur CSS du schéma : celle du conteneur (max. BASE_WIDTH) multipliée par le zoom. */
export const svgWidth = (zoom: number): string => `calc(min(100%, ${BASE_WIDTH}px) * ${zoom})`
