export const RANGE_LABEL = 'Fenêtre'
export const NOW_LABEL = 'Direct'
export const NOW_MARK = 'maintenant'

/** Le bouton « Direct » : se soulève au survol, s'enfonce au clic (et retombe en douceur). */
export const NOW_BUTTON_CLASS =
  'transition duration-150 hover:enabled:-translate-y-0.5 hover:enabled:shadow-md hover:enabled:brightness-110 active:enabled:translate-y-0 active:enabled:scale-95 active:enabled:shadow-none active:enabled:brightness-90'
export const WRAP_CLASS = 'mt-3'
export const HEAD_CLASS = 'flex flex-wrap items-center justify-start gap-2 text-[0.85rem] text-muted'
export const CONTROLS_CLASS = 'flex flex-wrap items-center gap-2'
export const AXIS_CLASS = 'relative mt-2 h-16 cursor-grab touch-none select-none overflow-hidden rounded-lg border border-line bg-card active:cursor-grabbing'
export const FUTURE_CLASS = 'pointer-events-none absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,var(--color-line)_0_1px,transparent_1px_8px)] opacity-60'
export const NOW_LINE_CLASS = 'pointer-events-none absolute z-10 top-0 h-full w-0.5 -translate-x-1/2 bg-accent'
export const NOW_MARK_CLASS = 'absolute top-0.5 right-1.5 whitespace-nowrap text-[0.7rem] font-semibold text-accent'
export const COVERAGE_CLASS = 'pointer-events-none absolute bottom-5 h-1.5 rounded-sm bg-accent/30'
export const TICK_CLASS = 'pointer-events-none absolute top-0 h-full border-l border-line'
export const TICK_LABEL_CLASS = 'absolute bottom-0.5 -translate-x-1/2 whitespace-nowrap text-[0.7rem] text-muted'
export const CLIP_SPAN_CLASS = 'pointer-events-none absolute top-1 h-9 rounded border border-dashed border-accent bg-accent/15'
export const CLIP_SPAN_TITLE = 'Étendue de la vidéo'
export const MARKER_CLASS = 'absolute top-2 h-7 cursor-pointer rounded border p-0 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-accent'
export const MARKER_IDLE_CLASS = 'border-accent bg-accent/60'
export const MARKER_SELECTED_CLASS = 'border-accent bg-accent'
export const MARKER_ONGOING_CLASS = 'border-danger bg-[repeating-linear-gradient(45deg,var(--color-danger)_0_6px,transparent_6px_12px)] animate-pulse'
export const CURSOR_CLASS = 'pointer-events-none absolute z-20 top-0 h-full w-0.5 -translate-x-1/2 bg-danger'

/** Le conseil d'usage tient trop de place sur un téléphone : il n'est écrit qu'à partir de 1024 px. */

/**
 * La frise verticale (téléphone, sous 1024 px) : l'instant le plus récent est en haut, comme un fil. Les graduations
 * sont des traits qui traversent l'axe, leur libellé à gauche ; la couverture est un mince trait, les événements des
 * blocs à droite des libellés.
 */
export const AXIS_VERTICAL_CLASS = 'relative mt-2 h-[min(60dvh,30rem)] cursor-grab touch-none select-none overflow-hidden rounded-lg border border-line bg-card active:cursor-grabbing'
export const FUTURE_VERTICAL_CLASS = 'pointer-events-none absolute inset-x-0 top-0 bg-[repeating-linear-gradient(135deg,var(--color-line)_0_1px,transparent_1px_8px)] opacity-60'
export const NOW_LINE_VERTICAL_CLASS = 'pointer-events-none absolute z-10 left-0 h-0.5 w-full -translate-y-1/2 bg-accent'
export const NOW_MARK_VERTICAL_CLASS = 'absolute right-1.5 top-0.5 whitespace-nowrap text-[0.7rem] font-semibold text-accent'
export const COVERAGE_VERTICAL_CLASS = 'pointer-events-none absolute left-14 w-1.5 rounded-sm bg-accent/30'
export const TICK_VERTICAL_CLASS = 'pointer-events-none absolute left-0 w-full border-t border-line'
export const TICK_LABEL_VERTICAL_CLASS = 'absolute left-1 top-0.5 whitespace-nowrap text-[0.7rem] text-muted'
export const CLIP_SPAN_VERTICAL_CLASS = 'pointer-events-none absolute left-[3.75rem] w-[7.5rem] rounded border border-dashed border-accent bg-accent/15'
/** Un événement court reste assez haut pour le doigt (16 px). */
export const MARKER_VERTICAL_CLASS = 'absolute left-16 w-28 min-h-4 cursor-pointer rounded border p-0 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-accent'
/**
 * La frise qui remplit sa place (écran du téléphone) : le bloc prend toute la hauteur du parent, l'axe tout ce qui reste
 * sous les commandes (« Direct » et les durées sont dans la frise).
 */
export const WRAP_FILL_CLASS = 'flex h-full min-h-0 flex-col pt-2'
export const AXIS_FILL_CLASS = 'relative mt-2 min-h-0 flex-1 cursor-grab touch-none select-none overflow-hidden rounded-lg border border-line bg-card active:cursor-grabbing'
export const CURSOR_VERTICAL_CLASS = 'pointer-events-none absolute z-20 left-0 h-0.5 w-full -translate-y-1/2 bg-danger'
