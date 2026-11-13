/** L'identifiant de la prise sur le plan (la clé de sa position gardée). */
export const PLUG_ID = 'prise'
/** La carte prend toute la largeur de la page. */
export const WRAPPER_CLASS = 'relative mt-4 min-w-0'
/**
 * La vue de la carte quand on choisit une caméra sur grand écran : un peu à l'est du jardin, pour laisser la place à la miniature à droite (position copiée de la carte : centre, zoom, cap).
 */
export const PREVIEW_VIEW = { lat: 48.522001, lng: 2.650227, zoom: 19.85, bearing: 37.7 }
/** La miniature de la caméra choisie : à côté de la limite de propriété à droite, en face de la caméra (sans position connue : à droite de la carte). */
export const THUMBNAIL_CLASS = 'absolute z-20 top-2.5 right-2.5 max-h-[calc(100%-1.25rem)] overflow-y-auto rounded-md shadow-lg'
/** La miniature se pose juste à droite de la limite de propriété (à `THUMBNAIL_GAP` pixels), centrée sur la hauteur de la caméra choisie, sans sortir de la carte. */
export const THUMBNAIL_WIDTH = 320
export const THUMBNAIL_GAP = 12
/** Ce que la vignette ajoute autour de sa vidéo (le nom au-dessus, la ligne du dernier événement dessous, les bordures), en pixels : sert à faire tenir une miniature en portrait dans la hauteur de la carte. */
export const THUMBNAIL_CHROME = 70
/** La largeur d'une miniature en portrait quand la hauteur de la carte n'est pas encore connue. */
export const THUMBNAIL_PORTRAIT_WIDTH = 224
/** La hauteur de l'aperçu du chauffage (son titre, son état et un bouton). */

/** Les blocs de la clim, du volet, du chauffage et du clip dans le cadre de 320 px de la carte : textes et boutons plus petits pour que tout rentre sans déborder. */
export const COMPACT_CLASS =
  'text-[0.78rem] [&_button:not([role=switch])]:px-2 [&_button:not([role=switch])]:py-1 [&_button:not([role=switch])]:text-[0.72rem] [&_label]:text-[0.78rem] [&_span]:text-[0.78rem]'
