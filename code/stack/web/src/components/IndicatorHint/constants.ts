/** L'enveloppe : l'infobulle se place par rapport à elle. */
export const WRAP_CLASS = 'relative flex'
/** Le bouton transparent autour de l'indicateur (il garde son dessin). */
export const BUTTON_CLASS =
  'flex cursor-pointer items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
/** L'infobulle : juste au-dessus de l'indicateur, alignée à gauche, sur plusieurs lignes si le texte est long. */
export const HINT_CLASS =
  'absolute bottom-full left-0 z-20 mb-1 w-max max-w-[15rem] rounded-md border border-line bg-card px-2 py-1 text-left text-[0.75rem] font-normal leading-snug text-fg shadow-lg'
/** L'infobulle se ferme seule après ce temps (ms). */
export const HINT_DELAY_MS = 6000
