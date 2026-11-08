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
  { id: 'schema', label: 'Schéma' },
  { id: 'settings', label: 'Réglages' },
]
export const LOCKED_TEXT = 'Entrez votre clé.'
export const CHECKING_TEXT = 'Vérification…'
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
export const THREADS_TITLE = 'Processeur par thread (2 dernières minutes)'
export const THREAD_WORD = 'Thread'
export const THREADS_GRID_CLASS = 'grid grid-cols-2 gap-x-4 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]'
/** Le bureau commence à cette largeur (le point de rupture `lg` de Tailwind) ; en dessous, c'est la mise en page mobile. */
export const DESKTOP_QUERY = '(min-width: 1024px)'
export const CPU_MEMORY_TITLE = 'Processeur et mémoire (RAM)'
export const LIVE_TITLE = 'En direct (2 dernières minutes)'
export const LIVE_CPU_TITLE = 'Processeur'
export const LIVE_MEMORY_TITLE = 'Mémoire (RAM)'
export const LIVE_CPU_LABEL = 'Utilisation du processeur sur les deux dernières minutes'
export const LIVE_MEMORY_LABEL = 'Utilisation de la mémoire sur les deux dernières minutes'
export const DOCKER_GLOBAL_TITLE = 'Configuration globale'
export const DOCKER_ENV_TITLE = 'Réglages (.env)'
export const DOCKER_ENV_NOTE = 'Les mots de passe et les clés sont masqués : leur valeur n’est jamais lue.'
export const DOCKER_IMAGES_TITLE = 'Images'
export const DOCKER_NETWORKS_TITLE = 'Réseaux'
export const DOCKER_DISK_TITLE = 'Espace utilisé par Docker'
export const DOCKER_COMPOSE_TITLE = 'docker-compose.yml'
export const DOCKER_CONTAINERS_TITLE = 'Conteneurs'
export const SPECS_TITLE = 'Caractéristiques'
export const SPECS_MISSING_TEXT = 'Caractéristiques indisponibles.'
export const NETWORK_TITLE = 'Réseau'
export const BRIDGE_TITLE = 'Pont Hue'
export const NETWORK_MISSING_TEXT = 'Réseau indisponible.'
export const MEMORY_CHART_LABEL = 'Mémoire utilisée et disponible'
export const CPU_CHART_LABEL = 'Part du processeur utilisée et libre'
export const SYSTEM_MISSING_TEXT = 'Mesure indisponible.'
export const POWER_TITLE = 'Consommation électrique'
export const POWER_MISSING_TEXT = 'Consommation indisponible.'
export const CAMERA_ENERGY_TITLE = 'Consommation des caméras (estimation)'
export const CAMERA_ENERGY_MISSING_TEXT = 'Énergie des caméras indisponible.'
export const LOADING_TEXT = 'Chargement…'

/** Les graphiques l'un sous l'autre de 360 à 1024 px (mobile), côte à côte au-delà (bureau). */
export const GRID_CLASS = 'grid grid-cols-1 gap-x-4 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,30rem),1fr))]'

export const ADDRESSES_TITLE = 'Adresses IP de la maison'
export const ADDRESSES_DETAIL = 'récapitulatif'
export const ADDRESS_COLUMNS = ['Adresse', 'Matériel', 'Port']
/** Une ligne par adresse : l’adresse, le matériel, le port utilisé. */
export const ADDRESS_ROWS: string[][] = [
  ['192.168.1.254', 'Freebox (la box)', ''],
  ['192.168.1.139 (mini.local)', 'Mini PC ACEMAGIC K1', '22, 8080, 8081, 8090'],
  ['192.168.1.33', 'Switch TP-Link ES208GP', '80'],
  ['192.168.1.141', 'Caméra Reolink voliere-exterieur', '554'],
  ['192.168.1.52', 'Caméra Reolink voliere-interieur', '554'],
  ['192.168.1.81', 'Pont Philips Hue', '80, 443'],
  ['192.168.1.200', 'Prise TP-Link Kasa HS100', '9999'],
  ['192.168.1.0/24', 'Réseau de la maison (Freebox)', ''],
  ['192.168.27.139', 'Mini PC vu du VPN WireGuard', '8080, 8081'],
  ['192.168.27.0/24', 'Réseau du VPN WireGuard (Freebox)', ''],
  ['100.x.y.z (<machine>.<réseau>.ts.net)', 'Mini PC vu de Tailscale : la page invité publique (Funnel)', '443 vers 8090'],
  ['IP publique (voir Freebox OS)', 'IP publique de la Freebox', 'aucun port ouvert'],
  ['172.17 à 172.21.x.x', 'Réseaux Docker internes du mini PC', '1984, 8554, 8080'],
]
