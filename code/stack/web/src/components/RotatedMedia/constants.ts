/** Le cadre en portrait (9/16), 298 px de large au plus (530 px de haut, la hauteur de la carte), centré ; en vue en grand (`--big-h`, posée par la carte) toute la hauteur de l'écran. */
export const FRAME_CLASS = 'relative mx-auto aspect-[9/16] w-full max-w-[min(100%,calc(var(--big-h,530px)*9/16))]'
/** Le média 16/9 : aussi large que le cadre est haut (16/9 de sa largeur), centré dans le cadre puis tourné d'un quart de tour horaire. */
export const TURNED_CLASS = 'absolute left-1/2 top-1/2 w-[177.7778%] -translate-x-1/2 -translate-y-1/2 rotate-90'
