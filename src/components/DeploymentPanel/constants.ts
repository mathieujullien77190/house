import type { DeployEntry } from './types'

/** Adresses du réseau de la maison (Freebox, 192.168.1.0/24), fixées par des baux DHCP statiques. */
export const SWITCH_IP = '192.168.1.33'
export const CAMERA_IP = '192.168.1.141'
export const CAMERA2_IP = '192.168.1.52'
export const BOX_IP = '192.168.1.254'
/** Le mini PC (Ubuntu Server, mDNS via avahi) : son nom, et son adresse fixée par un bail DHCP statique sur la box. */
export const MINI_IP = 'mini.local'
export const MINI_ADDRESS = '192.168.1.139'
/** Le réseau que le serveur VPN WireGuard de la Freebox donne à un téléphone connecté. */
export const VPN_NETWORK = '192.168.27.0/24'

export const ENTRIES: DeployEntry[] = [
  {
    id: 'box',
    name: 'Box (Freebox)',
    role: 'routeur, DHCP, serveur VPN WireGuard',
    url: 'http://mafreebox.freebox.fr',
    account: 'Freebox OS',
    note: `${BOX_IP}. Paramètres > Mode avancé > DHCP > Baux statiques : les caméras, le switch et le mini PC y ont une IP fixe. Paramètres > Mode avancé > Serveur VPN > WireGuard : un utilisateur de type WireGuard par appareil (un nom, pas de mot de passe utile).`,
  },
  {
    id: 'vpn',
    name: 'Accès distant (WireGuard)',
    role: 'le téléphone, hors de la maison',
    url: '',
    account: 'un utilisateur WireGuard par appareil',
    note: `Appli WireGuard sur le téléphone : on importe le QR code que donne la Freebox, on active le tunnel, puis on ouvre https://${MINI_ADDRESS}:8080 comme à la maison. Le téléphone reçoit une adresse du réseau ${VPN_NETWORK}. Rien n’est redirigé sur la Freebox : seul le port UDP de WireGuard est ouvert. Retirer un appareil perdu : supprimer son utilisateur dans Freebox OS.`,
  },
  {
    id: 'switch',
    name: 'Switch ES208GP',
    role: 'PoE, administration Omada',
    url: `http://${SWITCH_IP}`,
    account: 'admin (mot de passe changé)',
    note: 'Mode autonome, sans contrôleur. PoE > PoE Config pour couper ou relancer un port ; l’API le fait aussi (ports 3 et 4). Le switch n’accepte qu’une session à la fois : se déconnecter proprement (Logout).',
  },
  {
    id: 'cameras',
    name: 'Reolink RLC-810A × 2',
    role: 'caméras du portail (portail et camera2)',
    url: '',
    account: 'admin (app Reolink), le même mot de passe',
    note: `${CAMERA_IP} et ${CAMERA2_IP}, alimentées en PoE par le switch (portail sur le port 3, camera2 sur le 4). RTSP activé (port 554). Baux DHCP statiques sur la box. Flux rtsp://<adresse>:554/h264Preview_01_main et _sub.`,
  },
  {
    id: 'mini',
    name: 'Mini PC (ACEMAGIC K1)',
    role: 'Ubuntu Server 26.04 + Docker Compose : go2rtc, motion, House Sync, API, WebApp',
    url: '',
    account: 'SSH (clé) : mathieu@mini',
    note: `${MINI_IP} (${MINI_ADDRESS}), relié au switch (le switch à la box). go2rtc (1984, 8554) et l’API de l’enregistreur (8080 interne) n’ont pas de mot de passe : ils ne sont jamais publiés. Logs : docker compose logs -f motion.`,
  },
  {
    id: 'webapp',
    name: 'WebApp House',
    role: 'la page de la maison',
    url: `https://${MINI_IP}:8080`,
    account: 'clé secrète de l’API (API_KEY)',
    note: 'Une seule clé, saisie une fois : elle ouvre un cookie de session signé de 30 jours, la clé n’est gardée nulle part. Le direct (MJPEG) et les clips (lus en continu) passent par l’API.',
  },
  {
    id: 'api',
    name: 'House API',
    role: 'lecture seule : SQLite et clips ; PoE du switch',
    url: `https://${MINI_IP}:8080/welcome`,
    account: 'en-tête X-House-Key, ou le cookie de session',
    note: 'Services /auth, /direct, /events, /clips/id, /snapshots, /stream, /frame (relais de go2rtc), /poe (page web du switch) et /rootCA.crt (le certificat public, sans clé).',
  },
  {
    id: 'sync',
    name: 'House Sync',
    role: 'polling de l’enregistreur, base SQLite, clips',
    url: `https://${MINI_IP}:8081`,
    account: 'même clé que l’API',
    note: 'Écrit sur le SSD interne du mini PC (1 To) : clips, images par minute et events.db. Seul programme qui écrit ; l’API n’expose jamais la base brute. Montre aussi la machine (mémoire, processeur, disque), l’énergie et Docker.',
  },
  {
    id: 'ca',
    name: 'CA de la maison',
    role: 'certificat racine',
    url: `https://${MINI_IP}:8080/rootCA.crt`,
    account: '',
    note: 'À installer une fois sur chaque appareil (PC, téléphone) pour avoir le cadenas sur la WebApp et House Sync : on le télécharge à cette adresse (le certificat est public, jamais la clé rootCA-key.pem).',
  },
]

export const REMINDERS = [
  'Les mots de passe sont dans code/stack/.env (ignoré par git) et nulle part ailleurs.',
  'Les volumes de data/ sont sur le SSD interne : surveiller l’espace libre (df -h) et purger les clips anciens ; si l’IP du mini PC change, mettre à jour CERT_HOSTS dans .env, puis docker compose up -d.',
  'Dans le BIOS du mini PC : démarrage automatique après une coupure de courant.',
  `Pare-feu du mini PC (ufw) : SSH, 8080 et 8081 réservés au réseau de la maison et au VPN WireGuard de la Freebox (${VPN_NETWORK}). De l’extérieur : ce VPN, jamais une redirection de ports.`,
]

export const HEADERS = ['Quoi', 'Adresse', 'Compte', 'À savoir']
export const TABLE_CLASS = 'w-full border-collapse text-[0.9rem]'
export const HEAD_CELL_CLASS = 'border-b border-line px-2.5 py-1.5 text-left font-semibold'
export const CELL_CLASS = 'border-b border-line px-2.5 py-1.5 align-top'
export const NAME_CLASS = 'font-semibold'
export const ROLE_CLASS = 'text-[0.8rem] text-muted'
export const LINK_CLASS = 'break-all font-mono text-xs underline decoration-dotted underline-offset-2 hover:text-fg'
export const REMINDER_CLASS = 'mt-3 space-y-1 text-[0.85rem] text-muted'
