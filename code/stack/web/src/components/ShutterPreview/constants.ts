export const LOADING_TEXT = 'Lecture du volet…'
export const UNKNOWN_TEXT = 'Ce volet n’est pas dans la liste.'
/** Relu au même rythme que l'onglet Volet (`useShutters`) : 10 s, 2 s pendant un « Fermer à moitié ». */
export { POLL_MS, POLL_RUNNING_MS } from '@/components/ShuttersPanel/constants'
export const NOTE_CLASS = 'rounded-md border border-line bg-card p-3 text-[0.85rem] text-muted'
/** Bordure du bloc : bleue quand le volet est ouvert, violette quand son dernier ordre était « descendre » (baissé n'est pas éteint). */
export const WRAP_CLASS = 'rounded-lg border-2'
export const OPEN_BORDER_CLASS = 'border-[#8fd0f7]'
export const CLOSED_BORDER_CLASS = 'border-[#8b5cf6]'
