import { SHAPE_CLASS, SVG_CLASS } from './constants'
import { svgPoints } from './helpers'
import type { MotionShapeProps } from './types'

/** Les contours du mouvement, posés par-dessus la vidéo du clip (jamais dedans). Le trait garde la même épaisseur quelle que soit la taille de l'image. */
const MotionShape = ({ shapes }: MotionShapeProps) =>
  shapes.length > 0 ? (
    <svg className={SVG_CLASS} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {shapes.map((shape, index) => (
        <polygon
          key={index}
          className={SHAPE_CLASS}
          points={svgPoints(shape)}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  ) : null

export default MotionShape
