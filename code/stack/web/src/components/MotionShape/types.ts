export interface MotionShapeProps {
  /** Les polygones en parts de l'image (0 à 1) : un par mouvement. Vide : rien n'est dessiné. */
  shapes: [number, number][][]
}
