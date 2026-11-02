import type { TabId } from './types'

export const REFRESH_MS = 15_000
/** L'onglet Machine relit la mémoire et le processeur à ce rythme, et garde LIVE_CAPACITY mesures (2 minutes). */
export const LIVE_MS = 2_000
export const LIVE_CAPACITY = 60
export const TITLE = 'House Sync'
export const TABS_LABEL = 'Pages'
export const DEFAULT_TAB: TabId = 'db'
export const TABS: { id: TabId; label: string }[] = [
  { id: 'db', label: 'Base' },
  { id: 'disk', label: 'Disque' },
  { id: 'system', label: 'Machine' },
  { id: 'docker', label: 'Docker' },
]
export const LOCKED_TEXT = 'Entrez votre clé.'
export const CHECKING_TEXT = 'Vérification…'
export const REFRESH_LABEL = 'Rafraîchir'
export const LOGOUT_LABEL = 'Quitter'
export const DATABASE_TITLE = 'Base SQLite'
export const BACKUP_TITLE = 'Disque backup'
export const DISK_TITLE = 'Place sur le disque'
export const DISK_CHART_LABEL = 'Répartition de la place sur le disque : clips, images, base, autres fichiers et espace libre'
export const DOCKER_MISSING_TEXT =
  'Les conteneurs et la configuration du moteur manquent : le service house-docker de l’hôte ne répond pas (voir power/CLAUDE.md). Le docker-compose.yml, lui, est lu directement.'
export const DOCKER_NOTE =
  'Lu par un service de l’hôte (House Sync n’a jamais accès au socket Docker). Les variables d’environnement n’apparaissent que par leur nom, les processus que par leur nom de programme : ni mots de passe ni adresses de caméras.'
export const LIVE_START_LABEL = '−2 min'
export const LIVE_END_LABEL = 'maintenant'
export const LIVE_UNIT = '%'
export const LIVE_TITLE = 'En direct (2 dernières minutes)'
export const LIVE_CPU_TITLE = 'Processeur'
export const LIVE_MEMORY_TITLE = 'Mémoire (RAM)'
export const LIVE_CPU_LABEL = 'Utilisation du processeur sur les deux dernières minutes'
export const LIVE_MEMORY_LABEL = 'Utilisation de la mémoire sur les deux dernières minutes'
export const DOCKER_GLOBAL_TITLE = 'Configuration globale'
export const DOCKER_ENGINE_TITLE = 'Moteur Docker'
export const DOCKER_ENV_TITLE = 'Réglages (.env)'
export const DOCKER_ENV_NOTE = 'Les mots de passe et les clés sont masqués : leur valeur n’est jamais lue.'
export const DOCKER_IMAGES_TITLE = 'Images'
export const DOCKER_NETWORKS_TITLE = 'Réseaux'
export const DOCKER_DISK_TITLE = 'Espace utilisé par Docker'
export const DOCKER_COMPOSE_TITLE = 'docker-compose.yml'
export const DOCKER_CONTAINERS_TITLE = 'Conteneurs'
export const SPECS_TITLE = 'Caractéristiques'
export const SPECS_MISSING_TEXT = 'Caractéristiques indisponibles.'
export const MEMORY_TITLE = 'Mémoire (RAM)'
export const CPU_TITLE = 'Processeur'
export const MEMORY_CHART_LABEL = 'Mémoire utilisée et disponible'
export const CPU_CHART_LABEL = 'Part du processeur utilisée et libre'
export const SYSTEM_MISSING_TEXT = 'Mesure indisponible.'
export const POWER_TITLE = 'Consommation électrique'
export const POWER_MISSING_TEXT = 'Consommation indisponible.'
export const LOADING_TEXT = 'Chargement…'

export const TABS_CLASS = 'mt-4'
/** Les graphiques l'un sous l'autre de 360 à 1024 px (mobile), côte à côte au-delà (bureau). */
export const GRID_CLASS = 'grid grid-cols-1 gap-x-4 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,30rem),1fr))]'
