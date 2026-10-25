import type { DeployEntry } from './types'

/** Adresses du réseau de la maison (Freebox, 192.168.1.0/24), fixées par des baux DHCP statiques. */
export const PC_IP = '192.168.1.66'
export const SWITCH_IP = '192.168.1.33'
export const CAMERA_IP = '192.168.1.141'
export const BOX_IP = '192.168.1.254'

export const ENTRIES: DeployEntry[] = [
  {
    id: 'box',
    name: 'Box (Freebox)',
    role: 'routeur, DHCP',
    url: 'http://mafreebox.freebox.fr',
    account: 'Freebox OS',
    note: `${BOX_IP}. Paramètres > Mode avancé > DHCP > Baux statiques : la caméra, le switch et le PC y ont une IP fixe.`,
  },
  {
    id: 'switch',
    name: 'Switch ES208GP',
    role: 'PoE, administration Omada',
    url: `http://${SWITCH_IP}`,
    account: 'admin (mot de passe changé)',
    note: 'Mode autonome, sans contrôleur. PoE > PoE Config pour couper ou relancer un port ; PoE Auto Recovery avec le ping de la caméra.',
  },
  {
    id: 'camera',
    name: 'Reolink RLC-810A × 2',
    role: 'caméras du portail (portail et camera2)',
    url: '',
    account: 'admin (app Reolink)',
    note: `${CAMERA_IP}, alimentée en PoE par le switch. RTSP activé (port 554), HTTP, HTTPS et ONVIF fermés. Flux rtsp://${CAMERA_IP}:554/h264Preview_01_main et _sub.`,
  },
  {
    id: 'recorder',
    name: 'go2rtc et motion',
    role: 'flux et enregistrement',
    url: '',
    account: 'aucun (internes)',
    note: 'go2rtc (1984, 8554) et l’API de l’enregistreur (8080 interne) n’ont pas de mot de passe : ils ne sont jamais publiés, seuls les autres conteneurs les joignent. Logs : docker compose logs -f motion.',
  },
  {
    id: 'webapp',
    name: 'WebApp House',
    role: 'la page de la maison',
    url: `https://${PC_IP}:8080`,
    account: 'clé secrète de l’API (API_KEY)',
    note: 'Une seule clé : la même que l’API. Le direct (MJPEG) et les clips passent par l’API ; le navigateur ne parle qu’à l’API.',
  },
  {
    id: 'api',
    name: 'House API',
    role: 'lecture seule : SQLite et clips',
    url: `https://${PC_IP}:8080/welcome`,
    account: 'en-tête X-House-Key',
    note: 'Services /auth, /direct, /events (?last=1), /clips/id, /snapshots, /snapshot, /stream et /frame (relais de go2rtc). Ne parle qu’à go2rtc.',
  },
  {
    id: 'sync',
    name: 'House Sync',
    role: 'polling de l’enregistreur, base SQLite, clips',
    url: `https://${PC_IP}:8081`,
    account: 'même clé que l’API',
    note: 'Sa propre page : la base table par table et les fichiers du disque backup. Seul programme qui écrit ; l’API n’expose jamais la base brute.',
  },
  {
    id: 'ca',
    name: 'CA de la maison',
    role: 'certificat racine',
    url: '',
    account: '',
    note: 'Fichier data/certs/rootCA.pem, à installer une fois sur chaque appareil (PC, téléphone) pour avoir le cadenas sur la WebApp et House Sync.',
  },
]

export const REMINDERS = [
  'Les mots de passe sont dans code/phase0/.env (ignoré par git) et nulle part ailleurs.',
  'Si l’IP du PC change, mettre à jour CERT_HOSTS dans .env et l’adresse de la caméra si besoin, puis docker compose up -d.',
]

/** Phase 1 : les adresses des deux Pi restent à fixer par un bail DHCP statique sur la box. */
export const PI1_IP = '192.168.1.x'
export const PI2_IP = '192.168.1.y'
export const CAMERA2_IP = '192.168.1.52'

export const ENTRIES_PHASE1: DeployEntry[] = [
  ENTRIES[0],
  ENTRIES[1],
  {
    id: 'cameras',
    name: 'Reolink RLC-810A × 2',
    role: 'caméras du portail (portail et camera2)',
    url: '',
    account: 'admin (app Reolink), le même mot de passe',
    note: `${CAMERA_IP} et ${CAMERA2_IP}, alimentées en PoE par le switch (ports 7 et 6). RTSP activé (port 554). Baux DHCP statiques sur la box.`,
  },
  {
    id: 'pi1',
    name: 'Pi 1 · enregistreur',
    role: 'go2rtc + motion (agent k3s)',
    url: '',
    account: 'SSH (clé)',
    note: `${PI1_IP}. go2rtc (1984, 8554) et l’API de motion (8080) n’ont pas de mot de passe : le pare-feu du Pi 1 ne les ouvre qu’au Pi 2. Logs : kubectl logs -f deploy/motion (depuis le Pi 2).`,
  },
  {
    id: 'webapp',
    name: 'WebApp House',
    role: 'la page de la maison (Pi 2)',
    url: `https://${PI2_IP}:8080`,
    account: 'clé secrète de l’API (API_KEY)',
    note: 'Une seule clé : la même que l’API. Le direct (MJPEG) et les clips passent par l’API.',
  },
  {
    id: 'api',
    name: 'House API',
    role: 'lecture seule : SQLite et clips ; PoE du switch (Pi 2)',
    url: `https://${PI2_IP}:8080/welcome`,
    account: 'en-tête X-House-Key',
    note: 'Services /auth, /direct, /events, /clips/id, /snapshots, /stream, /frame (relais du go2rtc du Pi 1) et /poe (page web du switch).',
  },
  {
    id: 'sync',
    name: 'House Sync',
    role: 'polling de motion, base SQLite, clips (Pi 2)',
    url: `https://${PI2_IP}:8081`,
    account: 'même clé que l’API',
    note: 'Écrit sur le disque dur externe (USB, monté sur le Pi 2) : clips, images par minute et events.db. Seul programme qui écrit ; l’API n’expose jamais la base brute.',
  },
  ENTRIES[ENTRIES.length - 1],
]

export const REMINDERS_PHASE1 = [
  'Les mots de passe sont des Secrets k3s (créés avec kubectl, jamais dans git) et nulle part ailleurs.',
  'Le disque dur externe du Pi 2 doit être monté au démarrage (fstab) avant k3s ; si l’IP du Pi 2 change, mettre à jour le certificat de la maison, l’adresse du serveur k3s sur le Pi 1 et RECORDER_URLS.',
]

export const HEADERS = ['Quoi', 'Adresse', 'Compte', 'À savoir']
export const TABLE_CLASS = 'w-full border-collapse text-[0.9rem]'
export const HEAD_CELL_CLASS = 'border-b border-line px-2.5 py-1.5 text-left font-semibold'
export const CELL_CLASS = 'border-b border-line px-2.5 py-1.5 align-top'
export const NAME_CLASS = 'font-semibold'
export const ROLE_CLASS = 'text-[0.8rem] text-muted'
export const LINK_CLASS = 'break-all font-mono text-xs underline decoration-dotted underline-offset-2 hover:text-fg'
export const REMINDER_CLASS = 'mt-3 space-y-1 text-[0.85rem] text-muted'
