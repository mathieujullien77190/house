export const LOADING_TEXT = 'Lecture de la climatisation…'
export const UNKNOWN_TEXT = 'Cette climatisation n’est pas dans la liste.'
/** Relue au même rythme que l'onglet Clim (`useAcUnits`) : un changement fait à la télécommande apparaît ainsi. */
export { POLL_MS } from '@/components/AcPanel/constants'

export const WRAP_CLASS = 'flex flex-col gap-2 rounded-lg border-2'
/** Bordure du bloc : verte quand la clim est allumée, rouge quand elle est éteinte ou injoignable, normale tant qu'elle est inconnue. */
export const ON_BORDER_CLASS = 'border-green'
export const OFF_BORDER_CLASS = 'border-danger'
export const UNKNOWN_BORDER_CLASS = 'border-transparent'
export const NOTE_CLASS = 'rounded-md border border-line bg-card p-3 text-[0.85rem] text-muted'
