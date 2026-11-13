import type { TabId } from '@/types'

export const TITLE = 'House'
export const TABS_LABEL = 'Pages'
export const DEFAULT_TAB: TabId = 'home'
export const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'cameras', label: 'Caméras' },
  { id: 'lights', label: 'Lumière' },
  { id: 'shutters', label: 'Volet' },
  { id: 'ac', label: 'Clim' },
  { id: 'plug', label: 'Prise' },
  { id: 'box', label: 'Box' },
  { id: 'tv', label: 'Box TV' },
]
export const BACK_LABEL = '← Toutes les caméras'
export const LOCKED_TEXT = 'Entrez votre clé.'
export const CHECKING_TEXT = 'Vérification de la clé…'
export const NO_CAMERA_TEXT = 'Aucune caméra : House Sync n’a encore rien écrit.'

export const BACK_CLASS = 'mt-4'
/** Le bouton des notifications n'affiche que l'icône (🔕 quand le navigateur les bloque) ; le texte est dans l'infobulle et pour les lecteurs d'écran. */
export const NOTIFY_LABEL = { unsupported: '', denied: '🔕', off: '🔔', on: '🔔' } as const
export const NOTIFY_TITLE = {
  unsupported: '',
  denied: 'Notifications bloquées par le navigateur',
  off: 'Activer les notifications de mouvement',
  on: 'Notifications de mouvement activées',
} as const
