import type { ArchView } from './types'

export const TITLE_PHASE1 = 'Architecture de la phase 1'

/**
 * Phase 1 : les conteneurs du PC passent sur deux Pi. Pi 1 reçoit les flux des caméras (go2rtc + motion), Pi 2 sert
 * la WebApp et garde les clips (House Sync + API + WebApp) sur un disque dur externe.
 */
export const HARDWARE_PHASE1: ArchView = {
  id: 'hardware',
  label: 'Matériel',
  intro: [
    'Ce qui se branche : les deux Reolink sont alimentées en PoE par le switch, qui alimente aussi, par le réseau, deux Pi 5 et se relie à la box.',
    'Pi 1 reçoit les flux vidéo et les enregistre. Pi 2 copie les clips sur un disque dur externe en USB et sert la WebApp, que le téléphone ouvre par le WiFi de la box.',
  ],
  ariaLabel:
    'Vue matériel de la phase 1 : deux Reolink alimentées en PoE par le switch, branché au secteur ; le switch est relié à Pi 1 (enregistreur), à Pi 2 (serveur, avec un disque dur externe en USB) et à la box ; le téléphone rejoint la box en WiFi',
  viewBox: '0 0 1000 480',
  panels: [
    { id: 'cameras', x: 20, y: 20, w: 180, h: 440, tone: 'panel', title: 'Caméras' },
    { id: 'pis', x: 440, y: 20, w: 360, h: 440, tone: 'panel', title: 'Raspberry Pi' },
    { id: 'home', x: 830, y: 20, w: 150, h: 440, tone: 'panel', title: 'Maison' },
  ],
  boxes: [
    { id: 'cam1', x: 35, y: 100, w: 150, h: 90, tone: 'plain', title: 'Reolink · portail', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'cam2', x: 35, y: 250, w: 150, h: 90, tone: 'plain', title: 'Reolink · camera2', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'switch', x: 250, y: 150, w: 150, h: 110, tone: 'plain', title: 'Switch ES208GP', lines: ['8 ports PoE+ · 64 W', 'administrable (page web)'] },
    { id: 'mains', x: 240, y: 330, w: 110, h: 40, tone: 'warm', title: 'Prise 230 V ⚡', lines: [] },
    { id: 'rec', x: 480, y: 70, w: 280, h: 100, tone: 'plain', title: 'Pi 1 · enregistreur', lines: ['Pi 5 · go2rtc + motion', 'alimentation 27 W ⚡', 'microSD : 6 h de segments'] },
    { id: 'hub', x: 480, y: 210, w: 280, h: 110, tone: 'plain', title: 'Pi 2 · serveur', lines: ['Pi 5 · House Sync + API + WebApp', 'alimentation 27 W ⚡', 'USB 3 : disque dur externe'] },
    { id: 'phone', x: 845, y: 100, w: 120, h: 90, tone: 'plain', title: 'Téléphone', lines: ['WiFi'] },
    { id: 'box', x: 845, y: 250, w: 120, h: 90, tone: 'plain', title: 'Box', lines: ['internet', 'WiFi'] },
  ],
  arrows: [
    { id: 'cam1', d: 'M185 145 H215 V180 H248', both: true },
    { id: 'cam2', d: 'M185 295 H215 V230 H248', both: true },
    { id: 'mains', d: 'M295 328 V262' },
    { id: 'rec', d: 'M402 180 H430 V120 H478', both: true },
    { id: 'hub', d: 'M402 230 H430 V265 H478', both: true },
    { id: 'usb', d: 'M620 322 V346', both: true },
    { id: 'box', d: 'M375 262 V452 H905 V342', both: true },
    { id: 'wifi', d: 'M905 248 V192', both: true },
  ],
  labels: [
    { id: 'poe1', x: 212, y: 138, text: 'PoE', anchor: 'middle' },
    { id: 'poe2', x: 212, y: 288, text: 'PoE', anchor: 'middle' },
    { id: 'mains', x: 303, y: 300, text: '230 V' },
    { id: 'rj45a', x: 430, y: 112, text: 'RJ45', anchor: 'middle' },
    { id: 'rj45b', x: 430, y: 258, text: 'RJ45', anchor: 'middle' },
    { id: 'usb', x: 628, y: 338, text: 'USB 3' },
    { id: 'rj45c', x: 540, y: 446, text: 'RJ45 vers la box', anchor: 'middle' },
    { id: 'wifi', x: 915, y: 224, text: 'WiFi' },
  ],
  disks: [{ id: 'ssd', cx: 620, cy: 372, title: 'Disque dur externe', lines: ['clips · images · base'] }],
}

export const SOFTWARE_PHASE1: ArchView = {
  id: 'software',
  label: 'Logiciel',
  intro: [
    'Deux Pi qui forment un petit cluster k3s : Pi 2 est le serveur (control-plane), Pi 1 un agent. Pi 1 fait tourner go2rtc et motion (les mêmes conteneurs que sur le PC, en pods), Pi 2 fait tourner House Sync, et House API qui sert la WebApp.',
    'go2rtc ouvre une seule connexion vers chaque caméra. motion enregistre le flux principal par segments sur la microSD du Pi 1, détecte le mouvement sur le flux léger et fabrique les clips. House Sync, sur Pi 2, interroge motion par le réseau, copie les clips et une image par minute sur le disque dur externe, et écrit dans SQLite les événements et l’adresse du go2rtc de chaque caméra.',
    'L’utilisateur donne sa clé à House API depuis la WebApp, une seule fois : l’API pose un cookie de session. Le direct et l’image à l’instant viennent du go2rtc du Pi 1, relayés par l’API à travers le réseau ; les événements, les clips et les images par minute viennent de SQLite et du disque dur externe.',
    'Sécurité : go2rtc (1984, 8554) et l’API de motion n’ont pas de mot de passe : ils ne répondent qu’à Pi 2, le pare-feu du Pi 1 refuse le reste. Seuls l’API (8080) et la page de House Sync (8081), avec la clé, sont ouverts au réseau de la maison.',
    'L’API coupe ou rend le PoE du port d’une caméra en se connectant à la page web du switch (compte admin dans une variable d’environnement), comme sur le PC.',
  ],
  ariaLabel:
    'Vue logiciel de la phase 1 : deux Reolink envoient leur flux RTSP à go2rtc, sur Pi 1, qui le partage avec motion ; motion écrit les segments sur la microSD du Pi 1. Sur Pi 2, House Sync interroge motion par le réseau, copie les clips et une image par minute sur le disque dur externe et écrit dans SQLite ; House API relaie le direct de go2rtc, lit SQLite et le disque dur externe, et coupe ou rend le PoE d’un port du switch ; l’utilisateur ouvre la WebApp',
  viewBox: '0 0 1340 620',
  panels: [
    { id: 'cam', x: 20, y: 20, w: 200, h: 580, tone: 'panel', title: 'Caméras' },
    { id: 'pi1', x: 260, y: 20, w: 330, h: 580, tone: 'panel', title: 'Pi 1 · enregistreur (agent k3s)' },
    { id: 'pi2', x: 660, y: 20, w: 490, h: 580, tone: 'panel', title: 'Pi 2 · serveur (serveur k3s)' },
    { id: 'docker-rec', x: 280, y: 70, w: 290, h: 300, tone: 'warm', title: 'k3s · pods go2rtc + motion' },
    { id: 'docker-sync', x: 680, y: 100, w: 200, h: 190, tone: 'warm', title: 'k3s · pod House Sync' },
    { id: 'docker-house', x: 900, y: 100, w: 230, h: 190, tone: 'warm', title: 'k3s · pod API + WebApp' },
  ],
  boxes: [
    { id: 'stream1', x: 40, y: 110, w: 160, h: 80, tone: 'plain', title: 'Reolink · portail', lines: ['flux 4K principal', 'flux léger'] },
    { id: 'stream2', x: 40, y: 260, w: 160, h: 80, tone: 'plain', title: 'Reolink · camera2', lines: ['flux 4K principal', 'flux léger'] },
    { id: 'go2rtc', x: 300, y: 110, w: 100, h: 90, tone: 'plain', title: 'go2rtc', lines: ['partage les flux', 'MJPEG · image'] },
    { id: 'motion', x: 440, y: 110, w: 110, h: 90, tone: 'plain', title: 'motion', lines: ['mouvement', 'segments · clips'] },
    { id: 'sync', x: 700, y: 140, w: 160, h: 90, tone: 'green', title: 'House Sync', lines: ['interroge motion', 'copie clips + images', 'écrit SQLite'] },
    { id: 'webapp', x: 915, y: 135, w: 200, h: 50, tone: 'green', title: 'WebApp', lines: [] },
    { id: 'api', x: 915, y: 200, w: 200, h: 80, tone: 'green', title: 'House API', lines: ['auth · stream · frame', 'events · clips · poe'] },
    { id: 'browser', x: 1195, y: 110, w: 130, h: 90, tone: 'plain', title: 'Utilisateur', lines: ['ouvre la WebApp'] },
    { id: 'switch', x: 1195, y: 330, w: 130, h: 90, tone: 'plain', title: 'Switch ES208GP', lines: ['PoE port par port', 'alimente les caméras'] },
  ],
  arrows: [
    { id: 'rtsp1', d: 'M200 150 H298' },
    { id: 'rtsp2', d: 'M200 300 H240 V185 H298' },
    { id: 'restream', d: 'M400 155 H438' },
    { id: 'clips', d: 'M480 202 V212' },
    { id: 'polling', d: 'M698 185 H640 V155 H552' },
    { id: 'live', d: 'M913 255 H895 V320 H330 V202' },
    { id: 'app', d: 'M1193 160 H1117' },
    { id: 'api', d: 'M1015 187 V198' },
    { id: 'write', d: 'M780 232 V354' },
    { id: 'read', d: 'M1015 282 V400 H842' },
    { id: 'poe', d: 'M1090 282 V340 H1193' },
  ],
  labels: [
    { id: 'rtsp1', x: 249, y: 141, text: 'RTSP', anchor: 'middle' },
    { id: 'restream', x: 419, y: 146, text: 'RTSP', anchor: 'middle' },
    { id: 'clips', x: 488, y: 209, text: 'clips' },
    { id: 'polling', x: 618, y: 148, text: 'polling', anchor: 'middle' },
    { id: 'live', x: 640, y: 312, text: 'MJPEG · image (1984, réseau)', anchor: 'middle' },
    { id: 'app', x: 1160, y: 151, text: 'HTTP', anchor: 'middle' },
    { id: 'write', x: 788, y: 330, text: 'write' },
    { id: 'read', x: 930, y: 392, text: 'read (clips, images, base)', anchor: 'middle' },
    { id: 'poe', x: 1098, y: 312, text: 'poe on/off' },
    { id: 'poe-login', x: 1098, y: 326, text: 'page web · compte (env.)', note: true },
    { id: 'compose1', x: 280, y: 520, text: 'nodeSelector role=recorder :', note: true },
    { id: 'compose2', x: 280, y: 536, text: 'go2rtc + motion.', note: true },
    { id: 'compose3', x: 680, y: 520, text: 'nodeSelector role=hub :', note: true },
    { id: 'compose4', x: 680, y: 536, text: 'House Sync + API + WebApp.', note: true },
    { id: 'sec1', x: 680, y: 560, text: 'Ouverts au réseau : 8080 et 8081 (avec la clé).', note: true },
    { id: 'sec2', x: 280, y: 560, text: 'go2rtc et motion : seulement pour Pi 2.', note: true },
  ],
  disks: [
    { id: 'recordings', cx: 420, cy: 235, title: 'microSD du Pi 1', lines: ['6 h de segments'] },
    { id: 'ssd', cx: 770, cy: 380, rx: 85, title: 'Disque dur externe', lines: ['clips · images/minute', 'events.db (SQLite)'] },
  ],
}

export const CODE_INTRO_PHASE1 = [
  'Le code de la phase 1 est celui de la phase 0 (dossier code/phase0) : les mêmes images, répartis sur les deux Pi par k3s. Clique sur un fichier pour voir son code et ce qu’il fait.',
  'Il reste à écrire les manifestes k3s (Deployments, Services, Secrets) à la place du docker-compose.yml du PC. Le site n’exécute rien de ce code.',
]

export const DEPLOY_INTRO_PHASE1 = [
  'Où joindre chaque chose une fois la phase 1 installée : la box, le switch, les caméras, les deux Pi, la WebApp, l’API et House Sync.',
  'Les comptes sont nommés, jamais les mots de passe : ils sont dans le fichier .env de chaque Pi.',
]
