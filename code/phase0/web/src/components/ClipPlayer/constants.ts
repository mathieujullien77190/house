/** Le message selon le code d'erreur de la balise vidéo : 2 réseau, 3 décodage, 4 format non pris en charge. */
export const FAILURE_TEXT: Record<number, string> = {
  0: 'Le clip ne se lit pas.',
  2: 'Le clip n’a pas pu être chargé : le réseau a coupé. Réessaie.',
  3: 'Cet appareil n’arrive pas à décoder cette vidéo (H.265, 4K). Essaie sur un ordinateur.',
  4: 'Cet appareil ne lit pas ce format de vidéo (H.265, 4K). Essaie sur un ordinateur ou dans un autre navigateur.',
}
