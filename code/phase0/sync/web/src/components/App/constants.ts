import type { TabId } from './types'

export const REFRESH_MS = 15_000
export const TITLE = 'House Sync'
export const TABS_LABEL = 'Pages'
export const DEFAULT_TAB: TabId = 'db'
export const TABS: { id: TabId; label: string }[] = [
  { id: 'db', label: 'Base' },
  { id: 'disk', label: 'Disque' },
  { id: 'system', label: 'Machine' },
  { id: 'power', label: 'Énergie' },
]
export const INTRO = 'Le seul programme qui écrit ici. L’API et la WebApp ne lisent jamais cette page.'
export const LOCKED_TEXT = 'Entrez votre clé.'
export const CHECKING_TEXT = 'Vérification…'
export const REFRESH_LABEL = 'Rafraîchir'
export const LOGOUT_LABEL = 'Quitter'
export const DATABASE_TITLE = 'Base SQLite'
export const BACKUP_TITLE = 'Disque backup'
export const DISK_TITLE = 'Place sur le disque'
export const DISK_CHART_LABEL = 'Répartition de la place sur le disque : clips, images, base, autres fichiers et espace libre'
export const REFRESH_NOTE = 'rechargée toutes les 15 s, sauf média ouvert'
export const MEMORY_TITLE = 'Mémoire (RAM)'
export const CPU_TITLE = 'Processeur'
export const MEMORY_CHART_LABEL = 'Mémoire utilisée et disponible'
export const CPU_CHART_LABEL = 'Part du processeur utilisée et libre'
export const SYSTEM_NOTE =
  'Le système voit un peu moins que les 16 Go installés : le reste est réservé au processeur graphique intégré. Le pourcentage du processeur est mesuré sur une fraction de seconde à chaque rechargement.'
export const SYSTEM_MISSING_TEXT = 'Mesure indisponible.'
export const POWER_TITLE = 'Consommation électrique'
export const POWER_NOTE =
  'Mesuré : le processeur du mini PC et les caméras (PoE). Non mesuré : SSD, mémoire, alimentation du mini PC et switch. Pour la vraie consommation au mur, il faut une prise qui mesure l’énergie.'
export const POWER_MISSING_TEXT = 'Consommation indisponible.'
export const LOADING_TEXT = 'Chargement…'

export const TABS_CLASS = 'mt-4'
