export const ALT = 'Image de la caméra à cet instant'

export const IMAGE_CLASS = 'block aspect-video w-full rounded-md border border-line bg-black object-contain'
export const BOX_CLASS =
  'flex aspect-video w-full items-center justify-center whitespace-pre-line rounded-md border border-line bg-black px-3 text-center text-[0.85rem] text-muted'
/** Le cadre d'un message dans un cadre tourné : sa hauteur sert de largeur maximale au texte remis droit (voir UPRIGHT_CLASS). */
export const UPRIGHT_BOX_CLASS = `${BOX_CLASS} [container-type:size]`
export const FRAME_CLASS = 'relative'
export const LABEL_CLASS =
  'pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[0.7rem] text-white'
export const LOADING_TEXT = 'Chargement…'
export const LOADING_CLASS =
  'pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black text-[0.85rem] text-muted'
export const SPINNER_CLASS = 'h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent'
/** Le contenu du voile et du message, remis droit quand le cadre est tourné d'un quart de tour horaire (`upright`). */
export const LOADING_ROW_CLASS = 'flex items-center gap-2'
export const UPRIGHT_LOADING_CLASS = 'flex -rotate-90 items-center gap-2'
/** Le message remis droit : au plus aussi large que le cadre tourné (sa hauteur avant rotation), à la ligne là où le texte le demande. */
export const UPRIGHT_CLASS = 'block max-w-[calc(100cqh-1.5rem)] -rotate-90 whitespace-pre-line text-center'
/**
 * L'identifiant d'une image dans un cadre tourné d'un quart de tour horaire : il doit se lire droit, en bas à gauche de l'écran, c'est-à-dire au coin bas
 * droit du cadre non tourné. Posé juste à droite du cadre puis tourné de -90° autour de son coin bas gauche, il vient se ranger dans ce coin.
 */
export const UPRIGHT_LABEL_CLASS =
  'pointer-events-none absolute bottom-1.5 left-full origin-bottom-left -translate-x-1.5 -rotate-90 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[0.7rem] text-white'
