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
    name: 'Reolink RLC-810A',
    role: 'caméra du portail',
    url: '',
    account: 'admin (app Reolink)',
    note: `${CAMERA_IP}, alimentée en PoE par le switch. RTSP activé (port 554), HTTP, HTTPS et ONVIF fermés. Flux rtsp://${CAMERA_IP}:554/h264Preview_01_main et _sub.`,
  },
  {
    id: 'frigate',
    name: 'Frigate',
    role: 'détection et enregistrement',
    url: `https://${PC_IP}:8971`,
    account: 'admin · sync (viewer, pour House Sync)',
    note: 'Administration seulement (port 8971, avec connexion). Les ports 5000 et 1984 (go2rtc) ne sont jamais publiés ; la WebApp n’a pas besoin de s’y connecter.',
  },
  {
    id: 'webapp',
    name: 'WebApp House',
    role: 'la page de la maison',
    url: `https://${PC_IP}:8080`,
    account: 'clé secrète de l’API (API_KEY)',
    note: 'Une seule clé : la même que l’API. Le direct (MJPEG) et les clips passent par l’API ; aucune connexion à Frigate dans le navigateur.',
  },
  {
    id: 'api',
    name: 'House API',
    role: 'lecture seule : SQLite et clips',
    url: `https://${PC_IP}:8080/welcome`,
    account: 'en-tête X-House-Key',
    note: 'Services /auth, /direct, /events (?last=1), /clips/id, /snapshots, /snapshot, /stream et /frame (relais de go2rtc). Jamais d’appel à l’API de Frigate.',
  },
  {
    id: 'sync',
    name: 'House Sync',
    role: 'polling de Frigate, base SQLite, clips',
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
    note: 'Fichier data/certs/rootCA.pem, à installer une fois sur chaque appareil (PC, téléphone) pour avoir le cadenas sur Frigate et la WebApp.',
  },
]

export const REMINDERS = [
  'Les mots de passe sont dans code/phase0/.env (ignoré par git) et nulle part ailleurs.',
  'Si l’IP du PC change, mettre à jour FRIGATE_PUBLIC_URL et CERT_HOSTS dans .env, puis docker compose up -d.',
]

export const HEADERS = ['Quoi', 'Adresse', 'Compte', 'À savoir']
export const TABLE_CLASS = 'w-full border-collapse text-[0.9rem]'
export const HEAD_CELL_CLASS = 'border-b border-line px-2.5 py-1.5 text-left font-semibold'
export const CELL_CLASS = 'border-b border-line px-2.5 py-1.5 align-top'
export const NAME_CLASS = 'font-semibold'
export const ROLE_CLASS = 'text-[0.8rem] text-muted'
export const LINK_CLASS = 'break-all font-mono text-xs underline decoration-dotted underline-offset-2 hover:text-fg'
export const REMINDER_CLASS = 'mt-3 space-y-1 text-[0.85rem] text-muted'
