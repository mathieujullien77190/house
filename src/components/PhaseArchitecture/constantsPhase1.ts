import type { ArchView } from './types'

export const TITLE_PHASE1 = 'Architecture de la phase 1'

/**
 * Phase 1 : la pile de la phase 0 (Docker Compose) passe sur un mini PC neuf, avec un SSD externe en USB pour les clips
 * et la base. Pas de Pi ni de cluster : une seule machine.
 */
export const HARDWARE_PHASE1: ArchView = {
  id: 'hardware',
  label: 'Matériel',
  intro: [
    'Ce qui se branche : le switch alimente les deux Reolink en PoE et se relie au mini PC et à la box. Le mini PC reçoit les flux, enregistre, sert la WebApp et copie les clips sur un SSD externe en USB.',
    'Le téléphone ouvre la WebApp par le WiFi de la box. C’est la même pile que la phase 0 (Docker Compose), sur une machine neuve et sobre ; pas de microSD, pas de cluster.',
  ],
  ariaLabel:
    'Vue matériel de la phase 1 : deux Reolink alimentées en PoE par le switch, branché au secteur ; le switch est relié au mini PC (avec un SSD externe en USB) et à la box ; le téléphone rejoint la box en WiFi',
  viewBox: '0 0 1000 400',
  panels: [
    { id: 'cameras', x: 20, y: 20, w: 180, h: 360, tone: 'panel', title: 'Caméras' },
    { id: 'pc', x: 440, y: 20, w: 360, h: 360, tone: 'panel', title: 'Mini PC' },
    { id: 'home', x: 830, y: 20, w: 150, h: 360, tone: 'panel', title: 'Maison' },
  ],
  boxes: [
    { id: 'cam1', x: 35, y: 80, w: 150, h: 90, tone: 'plain', title: 'Reolink · portail', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'cam2', x: 35, y: 210, w: 150, h: 90, tone: 'plain', title: 'Reolink · camera2', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'switch', x: 250, y: 110, w: 150, h: 110, tone: 'plain', title: 'Switch ES208GP', lines: ['8 ports PoE+ · 64 W', 'administrable (page web)'] },
    { id: 'mains', x: 240, y: 290, w: 110, h: 40, tone: 'warm', title: 'Prise 230 V ⚡', lines: [] },
    { id: 'mini', x: 480, y: 70, w: 280, h: 120, tone: 'plain', title: 'Mini PC · Docker Compose', lines: ['BOSGAME E5 · Ryzen 3 5300U · 16 Go', 'SSD NVMe 512 Go : système et Docker', 'alimentation ⚡ · tout en conteneurs'] },
    { id: 'phone', x: 845, y: 90, w: 120, h: 90, tone: 'plain', title: 'Téléphone', lines: ['WiFi'] },
    { id: 'box', x: 845, y: 220, w: 120, h: 90, tone: 'plain', title: 'Box', lines: ['internet', 'WiFi'] },
  ],
  arrows: [
    { id: 'cam1', d: 'M185 125 H215 V160 H248', both: true },
    { id: 'cam2', d: 'M185 255 H215 V190 H248', both: true },
    { id: 'mains', d: 'M295 288 V222' },
    { id: 'mini', d: 'M402 150 H478', both: true },
    { id: 'usb', d: 'M620 192 V234', both: true },
    { id: 'box', d: 'M375 222 V362 H905 V312', both: true },
    { id: 'wifi', d: 'M905 218 V182', both: true },
  ],
  labels: [
    { id: 'poe1', x: 212, y: 118, text: 'PoE', anchor: 'middle' },
    { id: 'poe2', x: 212, y: 248, text: 'PoE', anchor: 'middle' },
    { id: 'mains', x: 303, y: 262, text: '230 V' },
    { id: 'rj45', x: 440, y: 142, text: 'RJ45', anchor: 'middle' },
    { id: 'usb', x: 628, y: 218, text: 'USB 3' },
    { id: 'rj45c', x: 540, y: 354, text: 'RJ45 vers la box', anchor: 'middle' },
    { id: 'wifi', x: 915, y: 204, text: 'WiFi' },
  ],
  disks: [{ id: 'ssd', cx: 620, cy: 262, title: 'SSD externe', lines: ['clips · images · base'] }],
}

export const CODE_INTRO_PHASE1 = [
  'Le code de la phase 1 est celui de la phase 0 (dossier code/phase0) : les mêmes conteneurs, lancés par le même docker-compose.yml, sur le mini PC. Clique sur un fichier pour voir son code et ce qu’il fait.',
  'Les clips et la base vont sur le SSD externe : il suffit de monter ce disque et de pointer les volumes de data/ dessus. Le site n’exécute rien de ce code.',
]

export const DEPLOY_INTRO_PHASE1 = [
  'Où joindre chaque chose une fois la phase 1 installée : la box, le switch, les caméras, le mini PC, la WebApp, l’API et House Sync.',
  'Les comptes sont nommés, jamais les mots de passe : ils sont dans le fichier .env du mini PC.',
]
