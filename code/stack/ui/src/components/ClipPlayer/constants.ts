export const CLOSE_LABEL = 'Fermer'
export const LOADING_TEXT = 'Téléchargement du clip…'

export const PLAYER_CLASS = 'w-full'
/** Le cadre de la vidéo : la barre de commandes s'y pose en bas, dans l'image. */
export const VIDEO_BOX_CLASS = 'relative'
export const BAR_OVERLAY_CLASS = 'absolute inset-x-0 bottom-0'
/** `barInset` : la barre s'arrête avant les boutons posés en bas à droite de la vidéo (agrandir, son, repères). */
export const BAR_INSET_CLASS = 'pr-24'
/** Les commandes natives du navigateur sans le son, l'agrandissement ni le menu « ⋮ » (télécharger, vitesse, image dans l'image…) : il ne reste que lecture et barre de temps. */
export const VIDEO_CLASS =
  'block aspect-video w-full bg-black object-contain [&::-webkit-media-controls-fullscreen-button]:hidden [&::-webkit-media-controls-mute-button]:hidden [&::-webkit-media-controls-overflow-button]:hidden [&::-webkit-media-controls-volume-slider]:hidden'
export const BOX_CLASS =
  'flex aspect-video w-full items-center justify-center bg-black text-[0.85rem] text-muted'
export const ERROR_CLASS = 'text-[0.85rem] text-danger'
export const CLOSE_CLASS = 'mt-1.5'
/** Le son du clip suit la vidéo : un écart plus petit que ça (en secondes) n'est pas corrigé, un petit décalage n'a pas d'importance. */
export const DRIFT_SECONDS = 0.4
export const SOUND_LABEL = 'Activer le son'
export const SOUND_CLASS = 'mt-1.5'
/** Les commandes maison (quand `controlsHost` est donné) : lecture ou pause et la barre de temps (le temps écrit est caché : seule la barre le montre). Posées hors du lecteur, droites. */
export const CONTROLS_CLASS = 'flex items-center gap-2 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6'
/** Lecture / pause : un carré de 32 px (`size-8`, `rounded-md`), comme tous les boutons posés sur une vidéo (retour, son, repères, réduire). */
export const PLAY_BUTTON_CLASS =
  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-bg/80 text-[0.75rem] leading-none text-fg hover:border-accent focus-visible:outline-2 focus-visible:outline-accent'
export const PLAY_LABEL = 'Lecture'
export const PAUSE_LABEL = 'Pause'
export const PLAY_ICON = '▶'
export const PAUSE_ICON = '❚❚'
export const SEEK_LABEL = 'Position dans le clip'
export const SEEK_CLASS = 'h-1.5 min-w-0 flex-1 cursor-pointer accent-accent'
