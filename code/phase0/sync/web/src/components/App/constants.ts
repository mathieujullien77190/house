import type { TabId } from './types'

export const REFRESH_MS = 15_000
export const TITLE = 'House Sync'
export const TABS_LABEL = 'Pages'
export const DEFAULT_TAB: TabId = 'db'
export const TABS: { id: TabId; label: string }[] = [
  { id: 'db', label: 'Base' },
  { id: 'disk', label: 'Disque' },
]
export const INTRO = 'Le seul programme qui écrit ici. L’API et la WebApp ne lisent jamais cette page.'
export const LOCKED_TEXT = 'Entrez votre clé.'
export const CHECKING_TEXT = 'Vérification…'
export const REFRESH_LABEL = 'Rafraîchir'
export const LOGOUT_LABEL = 'Quitter'
export const DATABASE_TITLE = 'Base SQLite'
export const BACKUP_TITLE = 'Disque backup'
export const REFRESH_NOTE = 'rechargée toutes les 15 s, sauf média ouvert'
export const LOADING_TEXT = 'Chargement…'

export const TABS_CLASS = 'mt-4'
