import type { TabId } from '@/types'

export const TITLE = 'House'
export const TABS_LABEL = 'Pages'
export const DEFAULT_TAB: TabId = 'cameras'
export const TABS: { id: TabId; label: string }[] = [
  { id: 'cameras', label: 'Caméras' },
  { id: 'api', label: 'API' },
]
export const BACK_LABEL = '← Toutes les caméras'
export const FORGET_LABEL = 'Oublier la clé'
export const LOCKED_TEXT = 'Entrez votre clé.'
export const CHECKING_TEXT = 'Vérification de la clé…'
export const CAMERAS_SUFFIX = ' caméra(s)'
export const NO_CAMERA_TEXT = 'Aucune caméra : House Sync n’a encore rien écrit.'

export const TABS_CLASS = 'mt-4'
export const BACK_CLASS = 'mt-4'
