import type { ArchView, BoxTone, PanelTone, ViewId } from './types'

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
  intro:
    'Ce qui se branche : le switch alimente la Reolink en PoE et se relie au PC, qui a une seconde carte réseau vers la box.',
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
  intro:
    'Trois conteneurs Docker (docker compose) : Frigate (avec go2rtc), House Sync, et House API qui sert la WebApp ; les disques backup et SQLite sont dans le conteneur House Sync, que l’API monte en lecture seule. go2rtc ouvre une seule connexion RTSP vers la caméra et la partage ; Frigate détecte le mouvement et enregistre les clips. House Sync interroge Frigate à intervalle régulier (polling), copie les nouveaux clips sur le disque backup et écrit tout dans une base SQLite : les événements (caméra, heure, chemin du fichier), l’adresse de la dernière image et l’adresse iframe du direct de chaque caméra. Il est le seul à y écrire. L’utilisateur ouvre la WebApp, qui appelle les trois services de House API. L’API ne construit rien et n’appelle pas Frigate : elle lit SQLite (adresses et événements, le dernier ou tous) et le disque backup (clips archivés). Le direct et l’image sont ensuite chargés directement par le navigateur de l’utilisateur depuis Frigate (qui relaie go2rtc), accessibles depuis le réseau de la maison. Côté sécurité, House Sync se connecte à Frigate avec un compte viewer sur le port 8971 (comme un navigateur), le port 5000 sans mot de passe n’est jamais publié, et le pare-feu du PC n’accepte que le réseau de la maison.',
  ariaLabel:
    'Vue logiciel de la phase 0 : trois conteneurs Docker sur le PC. La Reolink envoie son flux RTSP à go2rtc, qui le partage avec Frigate ; House Sync interroge Frigate, copie les clips sur le disque backup et écrit dans une base SQLite les événements, l’adresse de la dernière image et l’adresse iframe de chaque caméra ; l’utilisateur ouvre la WebApp, qui appelle les trois services de House API, lesquels lisent seulement SQLite et le disque backup',
  viewBox: '0 0 1260 620',
  panels: [
    { id: 'cam', x: 20, y: 20, w: 200, h: 580, tone: 'panel', title: 'Caméra' },
    { id: 'pc', x: 260, y: 20, w: 800, h: 580, tone: 'panel', title: 'PC de la maison' },
    { id: 'docker-frigate', x: 280, y: 70, w: 310, h: 240, tone: 'warm', title: 'Docker · Frigate' },
    { id: 'docker-sync', x: 470, y: 325, w: 370, h: 270, tone: 'warm', title: 'Docker · House Sync', titleEnd: true },
    { id: 'docker-house', x: 865, y: 60, w: 175, h: 315, tone: 'warm', title: 'Docker · API + WebApp' },
    { id: 'net', x: 1080, y: 300, w: 160, h: 300, tone: 'panel', title: 'Réseau' },
  ],
  boxes: [
    { id: 'stream', x: 40, y: 100, w: 160, h: 90, tone: 'plain', title: 'Reolink', lines: ['flux 4K principal', 'flux léger secondaire'] },
    { id: 'go2rtc', x: 300, y: 100, w: 100, h: 90, tone: 'plain', title: 'go2rtc', lines: ['partage', 'le flux'] },
    { id: 'frigate', x: 450, y: 100, w: 110, h: 90, tone: 'plain', title: 'Frigate', lines: ['mouvement', 'écrit les clips'] },
    { id: 'webapp', x: 875, y: 90, w: 155, h: 70, tone: 'green', title: 'WebApp', lines: ['la page web', 'appelle l’API'] },
    { id: 'api', x: 875, y: 245, w: 155, h: 100, tone: 'green', title: 'House API', lines: ['direct : lien iframe', 'image : dernière image', 'events : dernier ou tous'] },
    { id: 'sync', x: 480, y: 360, w: 150, h: 96, tone: 'green', title: 'House Sync', lines: ['interroge Frigate', 'copie les clips', 'écrit les adresses'] },
    { id: 'omada', x: 860, y: 540, w: 130, h: 50, tone: 'dashed', title: 'Omada', lines: ['contrôleur · plus tard'] },
    { id: 'browser', x: 1095, y: 80, w: 130, h: 90, tone: 'plain', title: 'Utilisateur', lines: ['ouvre la WebApp'] },
    { id: 'switch', x: 1095, y: 500, w: 130, h: 90, tone: 'plain', title: 'Switch', lines: ['PoE port par port'] },
  ],
  arrows: [
    { id: 'rtsp', d: 'M200 145 H298' },
    { id: 'restream', d: 'M400 145 H448' },
    { id: 'clips', d: 'M475 192 V216' },
    { id: 'polling', d: 'M550 360 V192' },
    { id: 'user-frigate', d: 'M1160 78 V45 H515 V98' },
    { id: 'direct', d: 'M895 162 V243' },
    { id: 'image', d: 'M940 162 V243' },
    { id: 'events', d: 'M985 162 V243' },
    { id: 'app', d: 'M1093 125 H1032' },
    { id: 'write', d: 'M632 408 H668' },
    { id: 'write-db', d: 'M590 458 V521 H653' },
    { id: 'read-backup', d: 'M910 347 V400 H812' },
    { id: 'read-db', d: 'M980 347 V521 H827' },
    { id: 'poe-off', d: 'M992 565 H1093', dashed: true },
  ],
  labels: [
    { id: 'rtsp', x: 249, y: 136, text: 'RTSP', anchor: 'middle' },
    { id: 'restream', x: 424, y: 136, text: 'RTSP', anchor: 'middle' },
    { id: 'clips', x: 483, y: 209, text: 'clips' },
    { id: 'polling', x: 558, y: 338, text: 'polling · 8971' },
    { id: 'user-frigate', x: 790, y: 38, text: 'direct · image (8971, login)', anchor: 'middle' },
    { id: 'polling-login', x: 558, y: 352, text: 'login viewer', note: true },
    { id: 'direct', x: 901, y: 207, text: 'direct' },
    { id: 'image', x: 946, y: 207, text: 'image' },
    { id: 'events', x: 991, y: 207, text: 'events' },
    { id: 'app', x: 1062, y: 116, text: 'HTTP', anchor: 'middle' },
    { id: 'write', x: 650, y: 399, text: 'write', anchor: 'middle' },
    { id: 'write-db', x: 598, y: 513, text: 'write' },
    { id: 'read-backup', x: 872, y: 417, text: 'read (clips)', anchor: 'middle' },
    { id: 'read-db', x: 905, y: 513, text: 'read', anchor: 'middle' },
    { id: 'poe-off', x: 1043, y: 555, text: 'coupe le PoE', anchor: 'middle' },
    { id: 'compose1', x: 280, y: 520, text: 'docker compose :', note: true },
    { id: 'compose2', x: 280, y: 536, text: 'trois conteneurs.', note: true },
    { id: 'sec1', x: 280, y: 560, text: 'Frigate : port 5000 non publié,', note: true },
    { id: 'sec2', x: 280, y: 576, text: 'seul le 8971 (avec connexion).', note: true },
  ],
  disks: [
    { id: 'frigate', cx: 420, cy: 234, title: 'Disque Frigate', lines: ['clips · images'] },
    { id: 'backup', cx: 740, cy: 378, title: 'Disque backup', lines: ['clips conservés'] },
    { id: 'sqlite', cx: 740, cy: 478, rx: 85, title: 'SQLite', lines: ['événements', 'adresse dernière image', 'adresse iframe'] },
  ],
}

export const VIEWS: Record<ViewId, ArchView> = { hardware: HARDWARE, software: SOFTWARE }
export const VIEW_OPTIONS: { id: ViewId; label: string }[] = [
  { id: 'hardware', label: HARDWARE.label },
  { id: 'software', label: SOFTWARE.label },
]
