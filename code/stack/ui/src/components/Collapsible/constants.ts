export const WRAP_CLASS = 'group'
const SUMMARY_BASE =
  'mb-1 flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 text-[1.1rem] lg:gap-x-4 font-semibold text-accent select-none [&::-webkit-details-marker]:hidden'
export const SUMMARY_CLASS = `mt-7 ${SUMMARY_BASE}`
/** Une section serrée : moins d'espace au-dessus, pour une liste de sections qui se suivent (les groupes de lumières). */
export const COMPACT_SUMMARY_CLASS = `mt-2 ${SUMMARY_BASE}`
/** Le caret, le titre et le détail forment une seule ligne centrée verticalement, de même interligne (le détail est plus petit). */
export const HEAD_CLASS = 'flex items-center gap-2 leading-none'
export const CARET_CLASS = 'inline-block text-[0.8rem] transition-transform group-open:rotate-90'
/**
 * Les commandes sur la ligne du titre, juste après lui (avec le texte ordinaire, pas celui du titre). Mêmes écarts que ceux d'une
 * ligne de LightsPanel, pour que les commandes d'un groupe tombent dans les colonnes de celles de ses lampes.
 */
export const ACTIONS_CLASS = 'flex cursor-default flex-wrap items-center gap-x-3 gap-y-2 text-[0.9rem] font-normal text-fg lg:gap-x-4'
export const DETAIL_CLASS = 'font-mono text-[0.8rem] font-normal text-muted'
