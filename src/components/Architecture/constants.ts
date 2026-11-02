import type { ArchView, ArchitectureConfig, BoxTone, PanelTone, ViewId } from './types'

export const TITLE = 'Architecture du système'
export const VIEW_GROUP_LABEL = 'Vue du schéma'
export const DEFAULT_VIEW: ViewId = 'hardware'
export const MARKER_ID = 'arch-arrow'

/** Une seule classe par propriété (fond, contour) : l'ordre des classes Tailwind n'est pas garanti. */
export const BOX_CLASS: Record<BoxTone, string> = {
  plain: 'fill-card stroke-fg stroke-[1.5]',
  warm: 'fill-backup/10 stroke-backup stroke-[1.5]',
  green: 'fill-pi/10 stroke-pi stroke-[1.5]',
  dashed: 'fill-card stroke-muted stroke-[1.5] [stroke-dasharray:6_4]',
}

export const PANEL_CLASS: Record<PanelTone, string> = {
  panel: 'fill-bg stroke-line stroke-[1.5]',
  warm: 'fill-backup/10 stroke-backup stroke-[1.5]',
}

export const PANEL_TITLE_CLASS = 'fill-fg text-[15px] font-bold'
export const DOCKER_TITLE_CLASS = 'fill-fg text-[13px] font-bold'
export const BOX_TITLE_CLASS = 'fill-fg text-sm font-bold'
export const BOX_LINE_CLASS = 'fill-muted text-[11.5px]'
export const ARROW_CLASS = 'fill-none stroke-fg stroke-[1.6]'
export const ARROW_DASHED_CLASS = 'fill-none stroke-muted stroke-[1.6] [stroke-dasharray:6_4]'
/** Le tunnel VPN : en bleu, à longs tirets, comme dans le plan de la maison. */
export const ARROW_VPN_CLASS = 'fill-none stroke-vpn stroke-[2.2] [stroke-dasharray:10_5]'
export const MARKER_CLASS = 'fill-fg'
export const LABEL_CLASS = 'fill-fg text-[11.5px]'
export const VPN_LABEL_CLASS = 'fill-vpn text-[11.5px] font-semibold'
export const NOTE_CLASS = 'fill-muted text-[10.5px]'
export const DISK_CLASS = 'fill-pi/10 stroke-pi stroke-[1.5]'
export const DISK_TOP_CLASS = 'fill-pi/20 stroke-pi stroke-[1.5]'

/** Demi-largeur, rayon vertical de l'ellipse et hauteur du corps d'un disque. */
export const DISK_SHAPE = { rx: 70, ry: 22, body: 50 }

const HARDWARE: ArchView = {
  id: 'hardware',
  label: 'Matériel',
  intro: [
    'Ce qui se branche : le switch (branché au secteur) alimente les deux Reolink en PoE et se relie au mini PC et à la box. Le mini PC reçoit les flux, enregistre, sert la WebApp et garde les clips sur son SSD interne de 1 To.',
    'Les applications s’ouvrent depuis le PC de la maison, par le WiFi de la box. Hors de la maison, un téléphone passe par le VPN WireGuard de la box : un tunnel chiffré par internet jusqu’à la box, qui le laisse atteindre le mini PC comme s’il était à la maison. Aucun port des applications n’est ouvert sur internet.',
  ],
  ariaLabel:
    'Vue matériel : deux Reolink alimentées en PoE par le switch, branché au secteur ; le switch est relié au mini PC (SSD interne de 1 To) et à la box ; le PC de la maison rejoint la box en WiFi ; depuis l’extérieur, un téléphone rejoint la box par un tunnel VPN WireGuard à travers internet',
  viewBox: '0 0 1000 545',
  panels: [
    { id: 'cameras', x: 20, y: 20, w: 180, h: 360, tone: 'panel', title: 'Caméras' },
    { id: 'pc', x: 440, y: 20, w: 360, h: 360, tone: 'panel', title: 'Mini PC' },
    { id: 'home', x: 830, y: 20, w: 150, h: 360, tone: 'panel', title: 'Maison' },
    { id: 'outside', x: 20, y: 405, w: 960, h: 120, tone: 'panel', title: 'Hors de la maison (4G ou autre WiFi)' },
  ],
  boxes: [
    { id: 'cam1', x: 35, y: 80, w: 150, h: 90, tone: 'plain', title: 'Reolink · portail', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'cam2', x: 35, y: 210, w: 150, h: 90, tone: 'plain', title: 'Reolink · camera2', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'switch', x: 250, y: 110, w: 150, h: 110, tone: 'plain', title: 'Switch ES208GP', lines: ['8 ports PoE+ · 64 W', 'administrable (page web)', 'alimentation ⚡'] },
    { id: 'mini', x: 480, y: 70, w: 280, h: 120, tone: 'plain', title: 'Mini PC · Docker Compose', lines: ['ACEMAGIC K1 · Ryzen 5 7530U · 16 Go', 'SSD M.2 1 To : système, Docker, clips', 'alimentation ⚡ · tout en conteneurs'] },
    { id: 'pc', x: 845, y: 70, w: 120, h: 80, tone: 'plain', title: 'PC', lines: ['ouvre les applications', 'WiFi'] },
    { id: 'box', x: 845, y: 205, w: 120, h: 90, tone: 'plain', title: 'Box', lines: ['internet · WiFi', 'serveur VPN', 'WireGuard'] },
    { id: 'remote', x: 60, y: 440, w: 190, h: 70, tone: 'plain', title: 'Téléphone', lines: ['appli WireGuard', 'ouvre 192.168.27.139 : 8080 · 8081'] },
    { id: 'internet', x: 400, y: 440, w: 200, h: 70, tone: 'dashed', title: 'Internet', lines: ['le tunnel est chiffré', 'de bout en bout'] },
  ],
  arrows: [
    { id: 'cam1', d: 'M185 125 H215 V160 H248', both: true },
    { id: 'cam2', d: 'M185 255 H215 V190 H248', both: true },
    { id: 'mini', d: 'M402 150 H478', both: true },
    { id: 'box', d: 'M375 222 V362 H905 V297', both: true },
    { id: 'wifi', d: 'M905 152 V203', both: true },
    { id: 'tunnel1', d: 'M252 475 H398', both: true, vpn: true },
    { id: 'tunnel2', d: 'M602 475 H935 V297', both: true, vpn: true },
  ],
  labels: [
    { id: 'poe1', x: 212, y: 118, text: 'PoE', anchor: 'middle' },
    { id: 'poe2', x: 212, y: 248, text: 'PoE', anchor: 'middle' },
    { id: 'rj45', x: 440, y: 142, text: 'RJ45', anchor: 'middle' },
    { id: 'rj45c', x: 540, y: 354, text: 'RJ45 vers la box', anchor: 'middle' },
    { id: 'wifi', x: 915, y: 183, text: 'WiFi' },
    { id: 'tunnel', x: 760, y: 466, text: 'tunnel WireGuard (UDP)', anchor: 'middle', vpn: true },
    { id: 'tunnel-note', x: 760, y: 500, text: 'seul port ouvert sur la box', anchor: 'middle', note: true },
  ],
}

const SOFTWARE: ArchView = {
  id: 'software',
  label: 'Logiciel',
  intro: [
    'Quatre conteneurs Docker sur le mini PC : une unité « go2rtc + motion » pour les deux caméras, House Sync, et House API qui sert la WebApp.',
    'L’unité est un go2rtc et son enregistreur motion : go2rtc ouvre une seule connexion vers chaque caméra et la partage ; motion enregistre le flux principal des deux caméras par segments, détecte le mouvement sur le flux léger et fabrique les clips. Une autre machine aurait sa propre unité. House Sync interroge l’enregistreur par polling, copie les clips et une image par minute sur le SSD du mini PC, et écrit dans SQLite les événements et l’adresse du go2rtc de chaque caméra.',
    'L’utilisateur donne sa clé une seule fois : House API pose un cookie de session signé de 30 jours (HttpOnly), que le navigateur renvoie ensuite tout seul ; la clé n’est gardée nulle part. Le direct (MJPEG, quelques images par seconde) et l’image à l’instant viennent du go2rtc, relayés par l’API dans le réseau Docker ; les événements, les clips et les images par minute viennent de SQLite et du SSD. Les clips se lisent en continu (par morceaux), sans les télécharger en entier. L’API n’appelle jamais l’enregistreur.',
    'Sécurité : le go2rtc (1984, 8554) et l’API de l’enregistreur n’ont pas de mot de passe et ne sont jamais publiés ; seuls l’API (8080) et la page de House Sync (8081), avec la clé, le sont, et le pare-feu du mini PC (ufw) les réserve au réseau de la maison et au VPN WireGuard de la Freebox.',
    'Allumer ou éteindre une caméra : l’API se connecte à la page web du switch (HTTP, compte admin dans une variable d’environnement, sans contrôleur Omada ni conteneur de plus) et coupe ou rend le PoE du port de la caméra (poe). Couper le port éteint vraiment la caméra ; son enregistreur réessaie alors son flux en boucle jusqu’au retour du courant.',
    'Accès distant : le téléphone, hors de la maison, ouvre un tunnel WireGuard vers la Freebox, qui lui donne une adresse du réseau 192.168.27.0/24 ; il voit alors le mini PC à l’adresse 192.168.27.139 et atteint ses ports 8080 (WebApp) et 8081 (House Sync) comme depuis la maison. Rien n’est redirigé sur la Freebox, et l’API sert le certificat public de la maison (/rootCA.crt) pour que le téléphone fasse confiance au HTTPS.',
  ],
  ariaLabel:
    'Vue logiciel : quatre conteneurs Docker sur le mini PC. Deux Reolink envoient chacune leur flux RTSP à un même go2rtc, qui le partage avec l’enregistreur motion et le relaie en MJPEG à House API ; House Sync interroge l’enregistreur, copie les clips et une image par minute sur le SSD du mini PC et écrit dans une base SQLite les événements et l’adresse du go2rtc de chaque caméra ; l’utilisateur ouvre la WebApp, qui appelle les services de House API (clé puis cookie de session), lesquels relaient le go2rtc pour le direct, lisent SQLite et le SSD pour le reste, et coupent ou rendent le PoE du port d’une caméra sur le switch ; à distance, un téléphone passe par le serveur VPN WireGuard de la Freebox pour atteindre les mêmes services',
  viewBox: '0 0 1340 715',
  panels: [
    { id: 'cam', x: 20, y: 20, w: 200, h: 675, tone: 'panel', title: 'Caméras' },
    { id: 'pc', x: 260, y: 20, w: 890, h: 675, tone: 'panel', title: 'Mini PC' },
    { id: 'docker-unit', x: 280, y: 70, w: 310, h: 230, tone: 'warm', title: 'Docker · go2rtc + motion (les 2 caméras)' },
    { id: 'docker-sync', x: 470, y: 415, w: 370, h: 270, tone: 'warm', title: 'Docker · House Sync', titleEnd: true },
    { id: 'docker-house', x: 865, y: 60, w: 270, h: 350, tone: 'warm', title: 'Docker · API + WebApp' },
  ],
  boxes: [
    { id: 'stream1', x: 40, y: 90, w: 160, h: 80, tone: 'plain', title: 'Reolink · portail', lines: ['flux 4K principal', 'flux léger'] },
    { id: 'stream2', x: 40, y: 190, w: 160, h: 80, tone: 'plain', title: 'Reolink · camera2', lines: ['flux 4K principal', 'flux léger'] },
    { id: 'go2rtc', x: 300, y: 105, w: 100, h: 170, tone: 'plain', title: 'go2rtc', lines: ['partage les 2 flux', 'MJPEG · image'] },
    { id: 'motion', x: 450, y: 105, w: 110, h: 170, tone: 'plain', title: 'motion', lines: ['mouvement', 'clips · 6 h', 'les 2 caméras'] },
    { id: 'webapp', x: 875, y: 90, w: 250, h: 70, tone: 'green', title: 'WebApp', lines: ['la page web', 'appelle l’API'] },
    { id: 'api', x: 875, y: 245, w: 250, h: 140, tone: 'green', title: 'House API', lines: ['auth : clé → cookie 30 jours', 'stream : direct MJPEG', 'frame : image à l’instant', 'events · clips · snapshots', 'poe : coupe / relance'] },
    { id: 'sync', x: 480, y: 450, w: 150, h: 96, tone: 'green', title: 'House Sync', lines: ['interroge motion', 'copie clips + images', 'écrit SQLite'] },
    { id: 'switch', x: 1195, y: 400, w: 130, h: 90, tone: 'plain', title: 'Switch ES208GP', lines: ['PoE port par port', 'alimente les caméras'] },
    { id: 'browser', x: 1195, y: 80, w: 130, h: 90, tone: 'plain', title: 'Utilisateur', lines: ['ouvre la WebApp', 'à la maison'] },
    { id: 'vpn', x: 1175, y: 515, w: 150, h: 75, tone: 'plain', title: 'Box · VPN', lines: ['serveur WireGuard', '192.168.27.0/24'] },
    { id: 'remote', x: 1175, y: 640, w: 150, h: 55, tone: 'plain', title: 'Téléphone 4G', lines: ['appli WireGuard'] },
  ],
  arrows: [
    { id: 'rtsp1', d: 'M200 130 H298' },
    { id: 'restream1', d: 'M400 130 H448' },
    { id: 'rtsp2', d: 'M200 230 H298' },
    { id: 'restream2', d: 'M400 230 H448' },
    { id: 'polling', d: 'M600 450 V190 H562' },
    { id: 'mjpeg', d: 'M873 262 H760 V320 H350 V277' },
    { id: 'auth', d: 'M905 162 V243' },
    { id: 'stream', d: 'M955 162 V243' },
    { id: 'frame', d: 'M1005 162 V243' },
    { id: 'events', d: 'M1055 162 V243' },
    { id: 'poe', d: 'M1105 162 V243' },
    { id: 'app', d: 'M1193 125 H1127' },
    { id: 'write', d: 'M632 498 H668' },
    { id: 'write-db', d: 'M590 548 V611 H653' },
    { id: 'read-backup', d: 'M910 387 V490 H812' },
    { id: 'read-db', d: 'M980 387 V611 H827' },
    { id: 'api-switch', d: 'M1100 387 V445 H1193' },
    { id: 'tunnel', d: 'M1250 638 V592', both: true, vpn: true },
    { id: 'vpn-pc', d: 'M1173 552 H1128', vpn: true },
  ],
  labels: [
    { id: 'rtsp1', x: 249, y: 121, text: 'RTSP', anchor: 'middle' },
    { id: 'restream1', x: 424, y: 121, text: 'RTSP', anchor: 'middle' },
    { id: 'rtsp2', x: 249, y: 221, text: 'RTSP', anchor: 'middle' },
    { id: 'restream2', x: 424, y: 221, text: 'RTSP', anchor: 'middle' },
    { id: 'polling', x: 608, y: 432, text: 'polling · interne' },
    { id: 'mjpeg', x: 680, y: 312, text: 'MJPEG · image (1984, réseau Docker)', anchor: 'middle' },
    { id: 'auth', x: 911, y: 207, text: 'auth' },
    { id: 'stream', x: 961, y: 207, text: 'stream' },
    { id: 'frame', x: 1011, y: 207, text: 'frame' },
    { id: 'events', x: 1061, y: 207, text: 'events' },
    { id: 'poe', x: 1111, y: 207, text: 'poe' },
    { id: 'app', x: 1160, y: 116, text: 'HTTP', anchor: 'middle' },
    { id: 'write', x: 650, y: 489, text: 'write', anchor: 'middle' },
    { id: 'write-db', x: 598, y: 603, text: 'write' },
    { id: 'read-backup', x: 872, y: 507, text: 'read (clips, images)', anchor: 'middle' },
    { id: 'read-db', x: 905, y: 603, text: 'read', anchor: 'middle' },
    { id: 'api-switch', x: 1108, y: 424, text: 'poe on/off' },
    { id: 'api-switch-login', x: 1108, y: 438, text: 'page web · compte (env.)', note: true },
    { id: 'compose1', x: 280, y: 600, text: 'docker compose :', note: true },
    { id: 'compose2', x: 280, y: 616, text: 'quatre conteneurs (+ certs).', note: true },
    { id: 'sec1', x: 280, y: 640, text: 'go2rtc et motion : non publiés,', note: true },
    { id: 'sec2', x: 280, y: 656, text: 'seuls 8080 et 8081 (avec la clé).', note: true },
    { id: 'tunnel', x: 1242, y: 620, text: 'tunnel', anchor: 'end', vpn: true },
    { id: 'vpn-ports', x: 1168, y: 544, text: '192.168.27.139 : 8080 · 8081', anchor: 'end', vpn: true },
    { id: 'vpn-note1', x: 1168, y: 574, text: 'pare-feu : maison + VPN', anchor: 'end', note: true },
  ],
  disks: [
    { id: 'backup', cx: 740, cy: 468, title: 'SSD du mini PC', lines: ['clips · images/minute'] },
    { id: 'sqlite', cx: 740, cy: 568, rx: 85, title: 'SQLite', lines: ['événements', 'images par minute', 'flux go2rtc par caméra'] },
  ],
}

/** Les interfaces : la même introduction pour tout le système. */
const INTERFACES_INTRO = [
  'Les deux interfaces web (la WebApp et la page de House Sync), le paquet @house/ui qu’elles partagent avec son Storybook, et House API qui sert la WebApp.',
  'Chaque application garde ses conteneurs (état, appels, calculs) et passe des props à des composants qui ne tiennent aucune donnée.',
]

const CODE_INTRO = [
  'Les fichiers du système, tels qu’ils sont dans le dépôt (dossier code/stack) : les conteneurs, lancés par le même docker-compose.yml sur le mini PC. Clique sur un fichier pour voir son code et ce qu’il fait.',
  'Les clips et la base vont sur le SSD interne de 1 To : les volumes de data/ y restent. Le site n’exécute rien de ce code.',
]

const DEPLOY_INTRO = [
  'Où joindre chaque chose : la box (et son VPN WireGuard), le switch, les caméras, le mini PC, la WebApp, l’API et House Sync.',
  'Les comptes sont nommés, jamais les mots de passe : ils sont dans le fichier .env du mini PC.',
]

/** Le système tel qu'il est : ses deux schémas et l'introduction des vues sans schéma. */
export const ARCHITECTURE: ArchitectureConfig = {
  title: TITLE,
  views: { hardware: HARDWARE, software: SOFTWARE },
  intros: { interfaces: INTERFACES_INTRO, code: CODE_INTRO, deploy: DEPLOY_INTRO },
}

export const VIEW_OPTIONS: { id: ViewId; label: string }[] = [
  { id: 'hardware', label: HARDWARE.label },
  { id: 'software', label: SOFTWARE.label },
  { id: 'interfaces', label: 'Interfaces' },
  { id: 'code', label: 'Code' },
  { id: 'deploy', label: 'Déploiement' },
]
