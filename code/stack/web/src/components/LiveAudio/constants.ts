/** Le bouton du son, sur la vidéo : juste l'icône (haut-parleur). La couleur du cadre dit l'état : neutre, accentué quand le son est ouvert, rouge quand il n'a pas démarré. */
export const BUTTON_CLASS =
  'flex size-8 cursor-pointer items-center justify-center rounded-md border bg-bg/80 text-[1.1rem] text-fg hover:border-accent focus-visible:outline-2 focus-visible:outline-accent'
export const BORDER_IDLE_CLASS = 'border-line'
export const BORDER_ON_CLASS = 'border-accent'
export const BORDER_FAILED_CLASS = 'border-danger'
export const LABEL_OFF = 'Activer le son du direct'
export const LABEL_ON = 'Couper le son du direct'
export const FAILED_TEXT = 'Pas de son : le micro de la caméra est-il activé ?'
/** Le gain du son (×32, soit environ 30 dB) : le micro des Reolink donne un son entre −50 et −60 dB, presque inaudible tel quel. */
export const GAIN = 32
