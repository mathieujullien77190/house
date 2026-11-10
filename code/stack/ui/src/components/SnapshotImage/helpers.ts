import { EMPTY_IMAGE } from './constants'

/**
 * Appelée quand l'image quitte la page : elle remplace l'adresse par une image vide, ce qui coupe la requête en cours. Utilisée comme `ref` de l'image ; elle est définie
 * **hors du composant** : une fonction recréée à chaque affichage serait « retirée » et « remise » à chaque fois, et couperait le flux pendant qu'on le regarde.
 */
export const releaseImage = (node: HTMLImageElement | null) => () => {
  if (node) node.src = EMPTY_IMAGE
}
