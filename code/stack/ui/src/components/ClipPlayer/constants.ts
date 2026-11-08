export const CLOSE_LABEL = 'Fermer'
export const LOADING_TEXT = 'Téléchargement du clip…'

export const PLAYER_CLASS = 'w-full'
/** Les commandes natives du navigateur sans le son, l'agrandissement ni le menu « ⋮ » (télécharger, vitesse, image dans l'image…) : il ne reste que lecture et barre de temps. */
export const VIDEO_CLASS =
  'block aspect-video w-full rounded-md border border-line bg-black object-contain [&::-webkit-media-controls-fullscreen-button]:hidden [&::-webkit-media-controls-mute-button]:hidden [&::-webkit-media-controls-overflow-button]:hidden [&::-webkit-media-controls-volume-slider]:hidden'
export const BOX_CLASS =
  'flex aspect-video w-full items-center justify-center rounded-md border border-line bg-black text-[0.85rem] text-muted'
export const ERROR_CLASS = 'text-[0.85rem] text-danger'
export const CLOSE_CLASS = 'mt-1.5'
/** Le son du clip suit la vidéo : un écart plus petit que ça (en secondes) n'est pas corrigé, un petit décalage n'a pas d'importance. */
export const DRIFT_SECONDS = 0.4
export const SOUND_LABEL = 'Activer le son'
export const SOUND_CLASS = 'mt-1.5'
/** Les commandes maison (quand `controlsHost` est donné) : lecture ou pause, la barre de temps, la position sur la durée. Posées hors du lecteur, droites. */
export const CONTROLS_CLASS = 'flex items-center gap-2'
export const PLAY_LABEL = 'Lecture'
export const PAUSE_LABEL = 'Pause'
export const PLAY_ICON = '▶'
export const PAUSE_ICON = '❚❚'
export const SEEK_LABEL = 'Position dans le clip'
export const SEEK_CLASS = 'h-1.5 min-w-0 flex-1 cursor-pointer accent-accent'
export const TIME_CLASS = 'shrink-0 font-mono text-[0.8rem] text-muted'
