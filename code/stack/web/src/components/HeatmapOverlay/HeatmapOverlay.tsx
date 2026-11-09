import { useEffect, useRef } from 'react'
import { CANVAS_CLASS } from './constants'
import { decodeLevel, paint } from './helpers'
import type { HeatmapOverlayProps } from './types'

/**
 * La carte de chaleur posée sur le direct : une petite image (une case par pixel) étirée sur toute la vidéo, que le navigateur lisse. Elle montre, pour le seuil de
 * changement choisi (`level`), où l'image a changé le plus souvent d'une image gardée à la suivante. Dans le cadre du média : elle tourne avec lui.
 */
const HeatmapOverlay = ({ data, level }: HeatmapOverlayProps) => {
  const canvas = useRef<HTMLCanvasElement>(null)
  const encoded = data.levels[Math.min(Math.max(level, 0), data.levels.length - 1)]

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context || encoded === undefined) return
    element.width = data.cols
    element.height = data.rows
    context.putImageData(
      new ImageData(paint(decodeLevel(encoded, data.cols * data.rows)) as Uint8ClampedArray<ArrayBuffer>, data.cols, data.rows),
      0,
      0,
    )
  }, [encoded, data.cols, data.rows])

  return <canvas ref={canvas} className={CANVAS_CLASS} aria-hidden="true" />
}

export default HeatmapOverlay
