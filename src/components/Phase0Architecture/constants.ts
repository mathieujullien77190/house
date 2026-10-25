import type { ArchView, BoxTone, DiagramViewId, PanelTone, ViewId } from './types'

export const TITLE = 'Architecture de la phase 0'
export const VIEW_GROUP_LABEL = 'Vue du schéma'
export const DEFAULT_VIEW: ViewId = 'hardware'
export const MARKER_ID = 'phase0-arrow'

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
export const MARKER_CLASS = 'fill-fg'
export const LABEL_CLASS = 'fill-fg text-[11.5px]'
export const NOTE_CLASS = 'fill-muted text-[10.5px]'
export const DISK_CLASS = 'fill-pi/10 stroke-pi stroke-[1.5]'
export const DISK_TOP_CLASS = 'fill-pi/20 stroke-pi stroke-[1.5]'

/** Demi-largeur, rayon vertical de l'ellipse et hauteur du corps d'un disque. */
export const DISK_SHAPE = { rx: 70, ry: 22, body: 50 }

const HARDWARE: ArchView = {
  id: 'hardware',
  label: 'Matériel',
  intro: [
    'Ce qui se branche : le switch alimente la Reolink en PoE et se relie au PC, qui a une seconde carte réseau vers la box.',
  ],
  ariaLabel:
    'Vue matériel de la phase 0 : la Reolink est alimentée en PoE par le switch, lui-même branché au secteur et au PC ; le PC est relié à la box, que le téléphone rejoint en WiFi',
  viewBox: '0 0 1000 400',
  panels: [
    { id: 'cameras', x: 20, y: 20, w: 380, h: 360, tone: 'panel', title: 'Réseau des caméras (sans box)' },
    { id: 'pc', x: 440, y: 20, w: 360, h: 360, tone: 'panel', title: 'PC de la maison' },
    { id: 'home', x: 840, y: 20, w: 140, h: 360, tone: 'panel', title: 'Maison' },
  ],
  boxes: [
    { id: 'cam', x: 40, y: 110, w: 130, h: 90, tone: 'plain', title: 'Reolink', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'switch', x: 230, y: 110, w: 150, h: 90, tone: 'plain', title: 'Switch ES208GP', lines: ['8 ports PoE+ · 64 W', 'administrable (Omada)'] },
    { id: 'mains', x: 230, y: 240, w: 150, h: 40, tone: 'warm', title: 'Prise 230 V ⚡', lines: [] },
    { id: 'pc', x: 480, y: 110, w: 280, h: 150, tone: 'plain', title: 'PC', lines: ['carte réseau 1 : switch', 'carte réseau 2 : box', 'disque : clips et images'] },
    { id: 'box', x: 855, y: 110, w: 110, h: 90, tone: 'plain', title: 'Box', lines: ['internet'] },
    { id: 'phone', x: 855, y: 240, w: 110, h: 90, tone: 'plain', title: 'Téléphone', lines: ['WiFi'] },
  ],
  arrows: [
    { id: 'poe', d: 'M170 155 H228', both: true },
    { id: 'mains', d: 'M305 238 V202' },
    { id: 'rj45', d: 'M382 155 H478', both: true },
    { id: 'lan', d: 'M762 155 H853', both: true },
    { id: 'wifi', d: 'M910 238 V202', both: true },
  ],
  labels: [
    { id: 'poe', x: 199, y: 146, text: 'PoE', anchor: 'middle' },
    { id: 'data', x: 199, y: 174, text: 'données', anchor: 'middle' },
    { id: 'mains', x: 312, y: 226, text: '230 V' },
    { id: 'rj45', x: 430, y: 146, text: 'RJ45', anchor: 'middle' },
    { id: 'nic1', x: 430, y: 174, text: 'carte 1', anchor: 'middle', note: true },
    { id: 'lan', x: 808, y: 146, text: 'RJ45 / WiFi', anchor: 'middle' },
    { id: 'nic2', x: 808, y: 174, text: 'carte 2', anchor: 'middle', note: true },
    { id: 'wifi', x: 918, y: 224, text: 'WiFi' },
    { id: 'ips1', x: 40, y: 318, text: 'Pas de DHCP : IP fixes pour la caméra,', note: true },
    { id: 'ips2', x: 40, y: 334, text: 'le switch et la carte réseau 1 du PC.', note: true },
    { id: 'iso', x: 40, y: 354, text: 'Les caméras ne voient que le PC.', note: true },
  ],
}

const SOFTWARE: ArchView = {
  id: 'software',
  label: 'Logiciel',
  intro: [
    'Quatre conteneurs Docker sur le PC : go2rtc, motion (l’enregistreur), House Sync, et House API qui sert la WebApp.',
    'go2rtc ouvre une seule connexion vers la caméra. motion enregistre le flux principal par segments, détecte le mouvement sur le flux léger et fabrique les clips. House Sync l’interroge par polling, copie les clips et une image par minute sur le disque backup, et écrit dans SQLite les événements et le nom du flux go2rtc de chaque caméra.',
    'L’utilisateur donne sa clé à House API depuis la WebApp, une seule fois : l’API pose un cookie de session. Le direct (MJPEG, quelques images par seconde) et l’image à l’instant viennent de go2rtc, relayés par l’API dans le réseau Docker ; les événements, les clips et les images par minute viennent de SQLite et du disque backup. L’API n’appelle jamais l’enregistreur.',
    'Sécurité : go2rtc (1984, 8554) et l’API de l’enregistreur n’ont pas de mot de passe et ne sont jamais publiés ; seuls l’API (8080) et la page de House Sync (8081), avec la clé, le sont, et le pare-feu limite l’accès au réseau de la maison.',
    'Allumer ou éteindre une caméra : l’API se connecte à la page web du switch (HTTP, compte admin dans une variable d’environnement, sans contrôleur Omada ni conteneur de plus) et coupe ou rend le PoE du port de la caméra (poe). Couper le port éteint vraiment la caméra ; l’enregistreur réessaie alors son flux en boucle jusqu’au retour du courant.',
  ],
  ariaLabel:
    'Vue logiciel de la phase 0 : quatre conteneurs Docker sur le PC. La Reolink envoie son flux RTSP à go2rtc, qui le partage avec l’enregistreur motion et le relaie en MJPEG à House API ; House Sync interroge l’enregistreur, copie les clips et une image par minute sur le disque backup et écrit dans une base SQLite les événements et le nom du flux de chaque caméra ; l’utilisateur ouvre la WebApp, qui appelle les services de House API (clé puis cookie de session), lesquels relaient go2rtc pour le direct, lisent SQLite et le disque backup pour le reste, et coupent ou rendent le PoE du port de la caméra sur le switch',
  viewBox: '0 0 1340 620',
  panels: [
    { id: 'cam', x: 20, y: 20, w: 200, h: 580, tone: 'panel', title: 'Caméra' },
    { id: 'pc', x: 260, y: 20, w: 890, h: 580, tone: 'panel', title: 'PC de la maison' },
    { id: 'docker-motion', x: 280, y: 70, w: 310, h: 240, tone: 'warm', title: 'Docker · go2rtc + motion' },
    { id: 'docker-sync', x: 470, y: 325, w: 370, h: 270, tone: 'warm', title: 'Docker · House Sync', titleEnd: true },
    { id: 'docker-house', x: 865, y: 60, w: 270, h: 350, tone: 'warm', title: 'Docker · API + WebApp' },
  ],
  boxes: [
    { id: 'stream', x: 40, y: 100, w: 160, h: 90, tone: 'plain', title: 'Reolink', lines: ['flux 4K principal', 'flux léger secondaire'] },
    { id: 'go2rtc', x: 300, y: 100, w: 100, h: 90, tone: 'plain', title: 'go2rtc', lines: ['partage le flux', 'MJPEG · image'] },
    { id: 'motion', x: 450, y: 100, w: 110, h: 90, tone: 'plain', title: 'motion', lines: ['mouvement', 'écrit les clips'] },
    { id: 'webapp', x: 875, y: 90, w: 250, h: 70, tone: 'green', title: 'WebApp', lines: ['la page web', 'appelle l’API'] },
    { id: 'api', x: 875, y: 245, w: 250, h: 140, tone: 'green', title: 'House API', lines: ['auth : clé → cookie', 'stream : direct MJPEG', 'frame : image à l’instant', 'events · clips · snapshots', 'poe : coupe / relance'] },
    { id: 'sync', x: 480, y: 360, w: 150, h: 96, tone: 'green', title: 'House Sync', lines: ['interroge motion', 'copie clips + images', 'écrit SQLite'] },
    { id: 'switch', x: 1195, y: 400, w: 130, h: 90, tone: 'plain', title: 'Switch ES208GP', lines: ['PoE port par port', 'alimente la caméra'] },
    { id: 'browser', x: 1195, y: 80, w: 130, h: 90, tone: 'plain', title: 'Utilisateur', lines: ['ouvre la WebApp'] },
  ],
  arrows: [
    { id: 'rtsp', d: 'M200 145 H298' },
    { id: 'restream', d: 'M400 145 H448' },
    { id: 'clips', d: 'M475 192 V216' },
    { id: 'polling', d: 'M550 360 V192' },
    { id: 'mjpeg', d: 'M873 316 H350 V192' },
    { id: 'auth', d: 'M905 162 V243' },
    { id: 'stream', d: 'M955 162 V243' },
    { id: 'frame', d: 'M1005 162 V243' },
    { id: 'events', d: 'M1055 162 V243' },
    { id: 'poe', d: 'M1105 162 V243' },
    { id: 'app', d: 'M1193 125 H1127' },
    { id: 'write', d: 'M632 408 H668' },
    { id: 'write-db', d: 'M590 458 V521 H653' },
    { id: 'read-backup', d: 'M910 387 V400 H812' },
    { id: 'read-db', d: 'M980 387 V521 H827' },
    { id: 'api-switch', d: 'M1100 387 V445 H1193' },
  ],
  labels: [
    { id: 'rtsp', x: 249, y: 136, text: 'RTSP', anchor: 'middle' },
    { id: 'restream', x: 424, y: 136, text: 'RTSP', anchor: 'middle' },
    { id: 'clips', x: 483, y: 209, text: 'clips' },
    { id: 'polling', x: 558, y: 338, text: 'polling · interne' },
    { id: 'mjpeg', x: 700, y: 308, text: 'MJPEG · image (1984, réseau Docker)', anchor: 'middle' },
    { id: 'auth', x: 911, y: 207, text: 'auth' },
    { id: 'stream', x: 961, y: 207, text: 'stream' },
    { id: 'frame', x: 1011, y: 207, text: 'frame' },
    { id: 'events', x: 1061, y: 207, text: 'events' },
    { id: 'poe', x: 1111, y: 207, text: 'poe' },
    { id: 'app', x: 1160, y: 116, text: 'HTTP', anchor: 'middle' },
    { id: 'write', x: 650, y: 399, text: 'write', anchor: 'middle' },
    { id: 'write-db', x: 598, y: 513, text: 'write' },
    { id: 'read-backup', x: 872, y: 417, text: 'read (clips, images)', anchor: 'middle' },
    { id: 'read-db', x: 905, y: 513, text: 'read', anchor: 'middle' },
    { id: 'api-switch', x: 1108, y: 424, text: 'poe on/off' },
    { id: 'api-switch-login', x: 1108, y: 438, text: 'page web · compte (env.)', note: true },
    { id: 'compose1', x: 280, y: 520, text: 'docker compose :', note: true },
    { id: 'compose2', x: 280, y: 536, text: 'quatre conteneurs (+ certs).', note: true },
    { id: 'sec1', x: 280, y: 560, text: 'go2rtc et motion : non publiés,', note: true },
    { id: 'sec2', x: 280, y: 576, text: 'seuls 8080 et 8081 (avec la clé).', note: true },
  ],
  disks: [
    { id: 'recordings', cx: 420, cy: 234, title: 'Disque motion', lines: ['6 h de segments'] },
    { id: 'backup', cx: 740, cy: 378, title: 'Disque backup', lines: ['clips · images/minute'] },
    { id: 'sqlite', cx: 740, cy: 478, rx: 85, title: 'SQLite', lines: ['événements', 'images par minute', 'flux go2rtc par caméra'] },
  ],
}

export const CODE_INTRO = [
  'Les fichiers de la phase 0, tels qu’ils sont dans le dépôt (dossier code/phase0). Clique sur un fichier pour voir son code et ce qu’il fait.',
  'C’est un squelette minimal : chaque bloc démarre et répond, le reste viendra ensuite. Le site n’exécute rien de ce code.',
]

export const DEPLOY_INTRO = [
  'Où joindre chaque chose une fois la phase 0 installée : la box, le switch, la caméra, l’enregistreur, la WebApp, l’API et House Sync.',
  'Les comptes sont nommés, jamais les mots de passe : ils sont dans le fichier .env du PC.',
]

export const VIEWS: Record<DiagramViewId, ArchView> = { hardware: HARDWARE, software: SOFTWARE }
export const INTROS: Record<Exclude<ViewId, DiagramViewId>, string[]> = { code: CODE_INTRO, deploy: DEPLOY_INTRO }
export const VIEW_OPTIONS: { id: ViewId; label: string }[] = [
  { id: 'hardware', label: HARDWARE.label },
  { id: 'software', label: SOFTWARE.label },
  { id: 'code', label: 'Code' },
  { id: 'deploy', label: 'Déploiement' },
]
