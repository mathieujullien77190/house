// La sélection de la carte de Home (caméra, chauffage, clim, volet, emoji de clip, box) : **un état global**, hors du composant. La Home est démontée quand on change d'onglet ; sans cela, le bloc
// choisi (un clip, une clim…) disparaissait au retour. Un seul objet est choisi à la fois ; la sélection n'est gardée que tant que la page reste ouverte (rien dans le navigateur).
import { useSyncExternalStore } from 'react'

export interface HomeSelection {
  /** L'identifiant de la caméra du plan choisie, vide si aucune. */
  camera: string
  /** Le chauffage est choisi. */
  plug: boolean
  /** L'identifiant de la clim choisie. */
  ac: string
  /** L'identifiant du volet choisi. */
  shutter: string
  /** L'identifiant du clip dont l'emoji est choisi. */
  emoji: string
  /** La box (le routeur du plan) est choisie. */
  box: boolean
}

const NONE: HomeSelection = { camera: '', plug: false, ac: '', shutter: '', emoji: '', box: false }

let current: HomeSelection = NONE
const listeners = new Set<() => void>()

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Choisit cet objet et lâche tous les autres ; sans argument, plus rien n'est choisi. */
export const chooseOnHome = (next: Partial<HomeSelection> = {}): void => {
  current = { ...NONE, ...next }
  for (const listener of listeners) listener()
}

/** Remet la sélection à zéro (les essais). */
export const resetHomeSelection = (): void => chooseOnHome()

export const useHomeSelection = (): HomeSelection => useSyncExternalStore(subscribe, () => current)
