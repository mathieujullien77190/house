// Donne à la colonne de vignettes en paysage (empilées) la largeur qui fait que, ensemble avec l'espace entre elles, elles ont exactement la hauteur d'une vignette en portrait voisine.
// La largeur est posée en `--col1` sur la grille. Mesuré dans la page (la hauteur d'une vignette comprend son nom et sa ligne du dernier événement), remesuré quand l'une ou l'autre change de taille.
import { useLayoutEffect, type RefObject } from 'react'

/** Le rapport d'une vidéo en paysage et la bordure d'une vignette (1 px de chaque côté). */
const RATIO = 9 / 16
const BORDER = 2
const MIN_WIDTH = 200
const MAX_WIDTH = 800

export const useStackWidth = (
  grid: RefObject<HTMLElement | null>,
  stack: RefObject<HTMLElement | null>,
  target: RefObject<HTMLElement | null>,
): void => {
  useLayoutEffect(() => {
    const host = grid.current
    const column = stack.current
    const goal = target.current
    if (!host || !column || !goal) return
    const update = () => {
      const tiles = [...column.children] as HTMLElement[]
      const wanted = goal.getBoundingClientRect().height
      // Colonne cachée ou vide, ou une seule colonne (téléphone) : la largeur de la grille s'applique.
      if (tiles.length === 0 || wanted === 0 || column.getBoundingClientRect().width === 0) {
        host.style.removeProperty('--col1')
        return
      }
      const gap = parseFloat(getComputedStyle(column).rowGap) || 0
      // Ce qu'une vignette a autour de sa vidéo (nom, dernier événement, bordures), mesuré : sa hauteur moins celle de sa vidéo.
      const around = tiles.reduce((sum, tile) => {
        const box = tile.getBoundingClientRect()
        return sum + box.height - (box.width - BORDER) * RATIO
      }, 0)
      const video = (wanted - gap * (tiles.length - 1) - around) / tiles.length
      const width = Math.round(video / RATIO + BORDER)
      host.style.setProperty('--col1', `${Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))}px`)
    }
    const observer = new ResizeObserver(update)
    observer.observe(goal)
    observer.observe(column)
    update()
    return () => observer.disconnect()
  })
}
