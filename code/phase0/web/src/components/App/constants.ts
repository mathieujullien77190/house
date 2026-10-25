import type { TabId } from '@/types'

export const TITLE = 'House'
export const TABS_LABEL = 'Pages'
export const DEFAULT_TAB: TabId = 'cameras'
export const TABS: { id: TabId; label: string }[] = [
  { id: 'cameras', label: 'Caméras' },
  { id: 'api', label: 'API' },
  { id: 'frigate', label: 'Frigate' },
]
export const FRIGATE_INTRO = 'L’interface de Frigate, telle quelle. La connexion se fait ici (admin) ; elle sert aussi à la dernière image de l’onglet Caméras.'
export const FRIGATE_EMPTY = 'Adresse de Frigate inconnue : House Sync n’a pas encore écrit celle du direct.'
export const FORGET_LABEL = 'Oublier la clé'
export const LOCKED_TEXT = 'Entrez votre clé.'
export const CHECKING_TEXT = 'Vérification de la clé…'
export const CAMERAS_SUFFIX = ' caméra(s)'
export const NO_CAMERA_TEXT = 'Aucune caméra : House Sync n’a encore rien écrit.'

export const PAGE_CLASS = 'mx-auto max-w-[1100px] px-4 py-4'
export const HEADER_CLASS = 'flex flex-wrap items-baseline gap-4'
export const TITLE_CLASS = 'm-0 text-2xl font-bold'
export const STATUS_CLASS = 'm-0 flex-1 text-[0.9rem] text-muted'
export const ERROR_CLASS = 'm-0 flex-1 text-[0.9rem] text-danger'
export const TABS_CLASS = 'mt-4'
export const MUTED_CLASS = 'mt-4 text-[0.9rem] text-muted'
