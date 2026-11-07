import type { TabId } from '@/types'

export const TITLE = 'House'
export const TABS_LABEL = 'Pages'
export const DEFAULT_TAB: TabId = 'home'
export const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'cameras', label: 'Caméras' },
  { id: 'lights', label: 'Lumière' },
  { id: 'plug', label: 'Prise' },
  { id: 'api', label: 'API' },
]
export const BACK_LABEL = '← Toutes les caméras'
export const FORGET_LABEL = 'Oublier la clé'
export const LOCKED_TEXT = 'Entrez votre clé.'
export const CHECKING_TEXT = 'Vérification de la clé…'
export const CAMERA_WORD = 'caméra'
export const LAMP_WORD = 'lampe'
/** Entre le nombre de caméras et celui de lampes, dans l'en-tête. */
export const COUNTS_SEPARATOR = ' / '
export const NO_CAMERA_TEXT = 'Aucune caméra : House Sync n’a encore rien écrit.'

export const BACK_CLASS = 'mt-4'
export const NOTIFY_LABEL = { unsupported: '', denied: '🔔 Bloquées par le navigateur', off: '🔔 Notifications', on: '🔔 Notifications activées' } as const
