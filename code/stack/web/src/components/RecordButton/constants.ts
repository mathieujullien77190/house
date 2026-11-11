/** Exactement le carré des autres boutons posés sur la vidéo (`MarkersToggle`, le son : 8 × 8, icône de 1,1 rem centrée, mêmes bordure et fond). */
export const BUTTON_CLASS =
  'flex size-8 cursor-pointer items-center justify-center rounded-md border border-line bg-bg/80 text-[1.1rem] hover:border-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-60'
/** L'icône : un rond en contour gris au repos, un rond plein rouge (qui pulse) pendant l'enregistrement. */
export const ICON_IDLE_CLASS = 'text-muted'
export const ICON_RECORDING_CLASS = 'animate-pulse text-danger motion-reduce:animate-none'
export const LABEL_START = 'Enregistrer un clip'
export const LABEL_STOP = 'Arrêter l’enregistrement'
