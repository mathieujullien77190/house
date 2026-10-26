import { CODE_INTRO_PHASE1, DEPLOY_INTRO_PHASE1, HARDWARE_PHASE1, SOFTWARE_PHASE1, TITLE_PHASE1 } from './constantsPhase1'
import type { ArchView, BoxTone, PanelTone, PhaseConfig, ViewId } from './types'

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
    'Ce qui se branche : le switch alimente les deux Reolink en PoE et se relie au PC, qui a une seconde carte réseau vers la box.',
  ],
  ariaLabel:
    'Vue matériel de la phase 0 : les deux Reolink sont alimentées en PoE par le switch, lui-même branché au secteur et au PC ; le PC est relié à la box, que le téléphone rejoint en WiFi',
  viewBox: '0 0 1000 400',
  panels: [
    { id: 'cameras', x: 20, y: 20, w: 380, h: 360, tone: 'panel', title: 'Réseau des caméras (sans box)' },
    { id: 'pc', x: 440, y: 20, w: 360, h: 360, tone: 'panel', title: 'PC de la maison' },
    { id: 'home', x: 840, y: 20, w: 140, h: 360, tone: 'panel', title: 'Maison' },
  ],
  boxes: [
    { id: 'cam2', x: 40, y: 230, w: 130, h: 80, tone: 'plain', title: 'Reolink · camera2', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'cam', x: 40, y: 110, w: 130, h: 90, tone: 'plain', title: 'Reolink · portail', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'switch', x: 230, y: 110, w: 150, h: 90, tone: 'plain', title: 'Switch ES208GP', lines: ['8 ports PoE+ · 64 W', 'administrable (Omada)'] },
    { id: 'mains', x: 230, y: 240, w: 150, h: 40, tone: 'warm', title: 'Prise 230 V ⚡', lines: [] },
    { id: 'pc', x: 480, y: 110, w: 280, h: 150, tone: 'plain', title: 'PC', lines: ['carte réseau 1 : switch', 'carte réseau 2 : box', 'disque : clips et images'] },
    { id: 'box', x: 855, y: 110, w: 110, h: 90, tone: 'plain', title: 'Box', lines: ['internet'] },
    { id: 'phone', x: 855, y: 240, w: 110, h: 90, tone: 'plain', title: 'Téléphone', lines: ['WiFi'] },
  ],
  arrows: [
    { id: 'poe', d: 'M170 155 H228', both: true },
    { id: 'poe2', d: 'M170 270 H200 V185 H228', both: true },
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
    { id: 'ips1', x: 40, y: 330, text: 'Pas de DHCP : IP fixes pour les caméras,', note: true },
    { id: 'ips2', x: 40, y: 346, text: 'le switch et la carte réseau 1 du PC.', note: true },
    { id: 'iso', x: 40, y: 366, text: 'Les caméras ne voient que le PC.', note: true },
  ],
}

const SOFTWARE: ArchView = {
  id: 'software',
  label: 'Logiciel',
  intro: [
    'Six conteneurs Docker sur le PC : deux unités « go2rtc + motion » (une par caméra), House Sync, et House API qui sert la WebApp.',
    'Une unité est un go2rtc et son enregistreur motion : go2rtc ouvre une seule connexion vers sa caméra ; motion enregistre le flux principal par segments, détecte le mouvement sur le flux léger et fabrique les clips. Ici les deux unités tournent sur le même PC, pour tester ; plus tard, chaque Pi aura la sienne. House Sync interroge chaque enregistreur par polling, copie les clips et une image par minute sur le disque backup, et écrit dans SQLite les événements et l’adresse du go2rtc de chaque caméra.',
    'L’utilisateur donne sa clé à House API depuis la WebApp, une seule fois : l’API pose un cookie de session. Le direct (MJPEG, quelques images par seconde) et l’image à l’instant viennent du go2rtc de chaque caméra, relayés par l’API dans le réseau Docker ; les événements, les clips et les images par minute viennent de SQLite et du disque backup. L’API n’appelle jamais les enregistreurs.',
    'Sécurité : les go2rtc (1984, 8554) et les API des enregistreurs n’ont pas de mot de passe et ne sont jamais publiés ; seuls l’API (8080) et la page de House Sync (8081), avec la clé, le sont, et le pare-feu limite l’accès au réseau de la maison.',
    'Allumer ou éteindre une caméra : l’API se connecte à la page web du switch (HTTP, compte admin dans une variable d’environnement, sans contrôleur Omada ni conteneur de plus) et coupe ou rend le PoE du port de la caméra (poe). Couper le port éteint vraiment la caméra ; son enregistreur réessaie alors son flux en boucle jusqu’au retour du courant.',
  ],
  ariaLabel:
    'Vue logiciel de la phase 0 : six conteneurs Docker sur le PC. Deux Reolink envoient chacune leur flux RTSP à leur propre unité, un go2rtc qui le partage avec son enregistreur motion et le relaie en MJPEG à House API ; House Sync interroge les deux enregistreurs, copie les clips et une image par minute sur le disque backup et écrit dans une base SQLite les événements et l’adresse du go2rtc de chaque caméra ; l’utilisateur ouvre la WebApp, qui appelle les services de House API (clé puis cookie de session), lesquels relaient les go2rtc pour le direct, lisent SQLite et le disque backup pour le reste, et coupent ou rendent le PoE du port d’une caméra sur le switch',
  viewBox: '0 0 1340 715',
  panels: [
    { id: 'cam', x: 20, y: 20, w: 200, h: 675, tone: 'panel', title: 'Caméras' },
    { id: 'pc', x: 260, y: 20, w: 890, h: 675, tone: 'panel', title: 'PC de la maison' },
    { id: 'docker-unit1', x: 280, y: 70, w: 310, h: 125, tone: 'warm', title: 'Docker · unité 1 : go2rtc + motion' },
    { id: 'docker-unit2', x: 280, y: 250, w: 310, h: 125, tone: 'warm', title: 'Docker · unité 2 : go2rtc + motion' },
    { id: 'docker-sync', x: 470, y: 415, w: 370, h: 270, tone: 'warm', title: 'Docker · House Sync', titleEnd: true },
    { id: 'docker-house', x: 865, y: 60, w: 270, h: 350, tone: 'warm', title: 'Docker · API + WebApp' },
  ],
  boxes: [
    { id: 'stream1', x: 40, y: 105, w: 160, h: 80, tone: 'plain', title: 'Reolink · portail', lines: ['flux 4K principal', 'flux léger'] },
    { id: 'stream2', x: 40, y: 285, w: 160, h: 80, tone: 'plain', title: 'Reolink · camera2', lines: ['flux 4K principal', 'flux léger'] },
    { id: 'go2rtc1', x: 300, y: 105, w: 100, h: 80, tone: 'plain', title: 'go2rtc', lines: ['partage le flux', 'MJPEG · image'] },
    { id: 'motion1', x: 450, y: 105, w: 110, h: 80, tone: 'plain', title: 'motion', lines: ['mouvement', 'clips · 6 h'] },
    { id: 'go2rtc2', x: 300, y: 285, w: 100, h: 80, tone: 'plain', title: 'go2rtc 2', lines: ['partage le flux', 'MJPEG · image'] },
    { id: 'motion2', x: 450, y: 285, w: 110, h: 80, tone: 'plain', title: 'motion 2', lines: ['mouvement', 'clips · 6 h'] },
    { id: 'webapp', x: 875, y: 90, w: 250, h: 70, tone: 'green', title: 'WebApp', lines: ['la page web', 'appelle l’API'] },
    { id: 'api', x: 875, y: 245, w: 250, h: 140, tone: 'green', title: 'House API', lines: ['auth : clé → cookie', 'stream : direct MJPEG', 'frame : image à l’instant', 'events · clips · snapshots', 'poe : coupe / relance'] },
    { id: 'sync', x: 480, y: 450, w: 150, h: 96, tone: 'green', title: 'House Sync', lines: ['interroge les 2 motion', 'copie clips + images', 'écrit SQLite'] },
    { id: 'switch', x: 1195, y: 400, w: 130, h: 90, tone: 'plain', title: 'Switch ES208GP', lines: ['PoE port par port', 'alimente les caméras'] },
    { id: 'browser', x: 1195, y: 80, w: 130, h: 90, tone: 'plain', title: 'Utilisateur', lines: ['ouvre la WebApp'] },
  ],
  arrows: [
    { id: 'rtsp1', d: 'M200 145 H298' },
    { id: 'restream1', d: 'M400 145 H448' },
    { id: 'rtsp2', d: 'M200 325 H298' },
    { id: 'restream2', d: 'M400 325 H448' },
    { id: 'polling1', d: 'M600 450 V150 H562' },
    { id: 'polling2', d: 'M545 450 V367' },
    { id: 'mjpeg1', d: 'M873 262 H760 V215 H350 V187' },
    { id: 'mjpeg2', d: 'M873 278 H745 V232 H330 V283' },
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
  ],
  labels: [
    { id: 'rtsp1', x: 249, y: 136, text: 'RTSP', anchor: 'middle' },
    { id: 'restream1', x: 424, y: 136, text: 'RTSP', anchor: 'middle' },
    { id: 'rtsp2', x: 249, y: 316, text: 'RTSP', anchor: 'middle' },
    { id: 'restream2', x: 424, y: 316, text: 'RTSP', anchor: 'middle' },
    { id: 'polling', x: 608, y: 432, text: 'polling · interne' },
    { id: 'mjpeg', x: 680, y: 207, text: 'MJPEG · image (1984, réseau Docker)', anchor: 'middle' },
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
    { id: 'compose2', x: 280, y: 616, text: 'six conteneurs (+ certs).', note: true },
    { id: 'sec1', x: 280, y: 640, text: 'go2rtc et motion : non publiés,', note: true },
    { id: 'sec2', x: 280, y: 656, text: 'seuls 8080 et 8081 (avec la clé).', note: true },
  ],
  disks: [
    { id: 'backup', cx: 740, cy: 468, title: 'Disque backup', lines: ['clips · images/minute'] },
    { id: 'sqlite', cx: 740, cy: 568, rx: 85, title: 'SQLite', lines: ['événements', 'images par minute', 'flux go2rtc par caméra'] },
  ],
}

/** Les interfaces ne changent pas d'une phase à l'autre : la même introduction pour toutes. */
export const INTERFACES_INTRO = [
  'Les deux interfaces web (la WebApp et la page de House Sync), le paquet @house/ui qu’elles partagent avec son Storybook, et House API qui sert la WebApp.',
  'Chaque application garde ses conteneurs (état, appels, calculs) et passe des props à des composants qui ne tiennent aucune donnée.',
]

export const CODE_INTRO = [
  'Les fichiers de la phase 0, tels qu’ils sont dans le dépôt (dossier code/phase0). Clique sur un fichier pour voir son code et ce qu’il fait.',
  'C’est un squelette minimal : chaque bloc démarre et répond, le reste viendra ensuite. Le site n’exécute rien de ce code.',
]

export const DEPLOY_INTRO = [
  'Où joindre chaque chose une fois la phase 0 installée : la box, le switch, la caméra, l’enregistreur, la WebApp, l’API et House Sync.',
  'Les comptes sont nommés, jamais les mots de passe : ils sont dans le fichier .env du PC.',
]

/** La configuration de chaque phase qui a une architecture : 0 (le PC) et 1 (deux Pi). */
export const PHASE_CONFIGS: Record<0 | 1, PhaseConfig> = {
  0: { title: TITLE, views: { hardware: HARDWARE, software: SOFTWARE }, intros: { interfaces: INTERFACES_INTRO, code: CODE_INTRO, deploy: DEPLOY_INTRO } },
  1: {
    title: TITLE_PHASE1,
    views: { hardware: HARDWARE_PHASE1, software: SOFTWARE_PHASE1 },
    intros: { interfaces: INTERFACES_INTRO, code: CODE_INTRO_PHASE1, deploy: DEPLOY_INTRO_PHASE1 },
  },
}
export const VIEW_OPTIONS: { id: ViewId; label: string }[] = [
  { id: 'hardware', label: HARDWARE.label },
  { id: 'software', label: SOFTWARE.label },
  { id: 'interfaces', label: 'Interfaces' },
  { id: 'code', label: 'Code' },
  { id: 'deploy', label: 'Déploiement' },
]
