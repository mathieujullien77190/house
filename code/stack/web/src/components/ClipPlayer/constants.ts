/** Le message selon le code d'erreur de la balise vidéo : 2 réseau, 3 décodage, 4 format non pris en charge. */
export const FAILURE_TEXT: Record<number, string> = {
  0: 'Le clip ne se lit pas.',
  2: 'Le clip n’a pas pu être chargé : le réseau a coupé. Réessaie.',
  3: 'Cet appareil n’arrive pas à décoder cette vidéo. Choisis la version H.264 · 720p, ou essaie sur un ordinateur.',
  4: 'Cet appareil ne lit pas ce format de vidéo. Choisis la version H.264 · 720p, ou essaie dans un autre navigateur.',
}
