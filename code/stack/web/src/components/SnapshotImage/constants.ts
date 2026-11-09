export const MISSING_TEXT = 'Pas d’image gardée à cet instant (une par minute, quelques jours).'
/** Une nouvelle image apparaît en fondu par-dessus la précédente (`snapshot-fade`, dans `index.css`). */
export const FADE_CLASS = 'absolute inset-0 animate-[snapshot-fade_250ms_ease-out]'
export const DEFAULT_FADE_MS = 250
export const FRAME_CLASS = 'relative'
/**
 * L'identifiant de l'image fond lui aussi : l'ancien s'efface (`snapshot-fade-out`) pendant que le nouveau apparaît, au même endroit. Mêmes classes que celles de
 * `@house/ui` (`SnapshotImage`), qui ne dessine plus l'identifiant quand deux images sont superposées.
 */
export const LABEL_CLASS = 'pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[0.7rem] text-white'
export const UPRIGHT_LABEL_CLASS =
  'pointer-events-none absolute bottom-1.5 left-full origin-bottom-left -translate-x-1.5 -rotate-90 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[0.7rem] text-white'
export const LABEL_FADE_IN_CLASS = 'animate-[snapshot-fade_250ms_ease-out]'
export const LABEL_FADE_OUT_CLASS = 'animate-[snapshot-fade-out_250ms_ease-out] [animation-fill-mode:forwards]'
