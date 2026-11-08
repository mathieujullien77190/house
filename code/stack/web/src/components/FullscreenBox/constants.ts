export const ICON = '⛶'
export const ENTER_LABEL = 'Afficher en grand'
export const EXIT_LABEL = 'Quitter le plein écran'
/** Le cadre : en plein écran, fond noir, contenu centré, et la hauteur de l'écran pour un clip en portrait (`--big-h`). */
export const BOX_CLASS =
  'relative [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:justify-center [&:fullscreen]:bg-black [&:fullscreen]:[--big-h:100dvh]'
/** Le carré posé sur le contenu, en haut à droite (au-dessus des commandes du clip). */
export const BUTTON_CLASS =
  'absolute right-2 top-2 z-10 cursor-pointer rounded-md border border-line bg-bg/80 px-2 py-1 text-[1rem] text-fg hover:border-accent focus-visible:outline-2 focus-visible:outline-accent'
