// Donne à la vignette d'une caméra posée de côté (en portrait) exactement la hauteur d'un autre bloc (la carte) : la hauteur de sa vidéo (`--big-h` sur la colonne) est celle du bloc moins
// tout ce que la vignette a autour (nom, dernier événement, bordures), mesuré dans la page. Remesuré quand l'un ou l'autre change de taille.
import { useLayoutEffect, type RefObject } from 'react'

/** La vidéo tournée se reconnaît à cet attribut (posé par RotatedMedia). */
const FRAME_SELECTOR = '[data-rotated-frame]'
const MIN_HEIGHT = 120

export const useMatchHeight = (target: RefObject<HTMLElement | null>, column: RefObject<HTMLElement | null>): void => {
  useLayoutEffect(() => {
    const goal = target.current
    const side = column.current
    if (!goal || !side) return
    const update = () => {
      const tile = side.firstElementChild
      const frame = side.querySelector(FRAME_SELECTOR)
      const wanted = goal.getBoundingClientRect().height
      // Bloc caché (téléphone) ou pas de vignette tournée : la hauteur par défaut de la vidéo s'applique.
      if (!tile || !frame || wanted === 0) {
        side.style.removeProperty('--big-h')
        return
      }
      const around = tile.getBoundingClientRect().height - frame.getBoundingClientRect().height
      side.style.setProperty('--big-h', `${Math.max(MIN_HEIGHT, Math.round(wanted - around))}px`)
    }
    const observer = new ResizeObserver(update)
    observer.observe(goal)
    observer.observe(side)
    update()
    return () => observer.disconnect()
  }, [target, column])
}
