export const EMOJI = '📷'
/**
 * Peut-on déplacer les 📷 (glisser) et les retirer (clic droit) ? **Non pour l'instant** : les places sont figées, un clic ouvre seulement la caméra. Passer à `true` pour pouvoir
 * de nouveau les placer.
 */
export const MARKERS_EDITABLE = false
export const OPEN_PREFIX = 'Ouvrir la caméra '
/** Le glisser ne commence qu'au-delà de cette distance (pixels) : en dessous, c'est un clic. */
export const DRAG_DISTANCE = 5
/** La couche qui couvre l'image : ses repères sont placés en parts de sa taille. */
export const LAYER_CLASS = 'absolute inset-0'
/** Un repère : juste le dessin d'un appareil photo (sans cadre), centré sur sa place, avec une ombre pour rester lisible sur l'image ; on l'attrape au doigt comme à la souris (sans que la page défile). */
export const MARKER_CLASS =
  'pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 touch-none select-none text-[1.6rem] leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
/** Le curseur d'un repère : la main qui attrape quand on peut le déplacer, la main qui clique sinon. */
export const MARKER_MOVABLE_CLASS = 'cursor-grab active:cursor-grabbing'
export const MARKER_FIXED_CLASS = 'cursor-pointer'
