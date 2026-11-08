import type { SchemaDiagram } from './types'

export const HARDWARE: SchemaDiagram = {
  id: 'hardware',
  title: 'Architecture matérielle',
  intro: 'Les appareils de la maison et ce qui les relie, de la volière jusqu’au téléphone.',
  tiers: [
    {
      id: 'cameras',
      nodes: [
        { id: 'cam-out', title: 'voliere-exterieur', detail: 'Reolink RLC-810A, PoE, 4K', tone: 'green' },
        { id: 'cam-in', title: 'voliere-interieur', detail: 'Reolink RLC-810A, PoE, 4K', tone: 'green' },
      ],
      link: 'un câble RJ45 par caméra : données et alimentation (PoE)',
    },
    {
      id: 'switch',
      nodes: [{ id: 'switch', title: 'Switch PoE TP-Link ES208GP', detail: 'caméras sur les ports 3 et 4, PoE coupé ou remis par House API', tone: 'green' }],
      link: 'RJ45',
    },
    {
      id: 'pc',
      nodes: [{ id: 'pc', title: 'Mini PC ACEMAGIC K1', detail: 'Ubuntu Server, SSD de 1 To, tout le système en conteneurs Docker', tone: 'accent' }],
      link: 'RJ45 vers la box',
    },
    {
      id: 'box',
      nodes: [{ id: 'box', title: 'Box (Freebox)', detail: 'internet, WiFi, serveur VPN WireGuard (un seul port UDP ouvert)', tone: 'muted' }],
      link: 'WiFi du réseau local · tunnel WireGuard depuis l’extérieur',
    },
    {
      id: 'around',
      nodes: [
        { id: 'hue', title: 'Pont Hue', detail: 'lampes, détecteurs de mouvement et de température', tone: 'green' },
        { id: 'plug', title: 'Prise Kasa HS100', detail: 'le chauffage de la volière, WiFi faible', tone: 'green' },
        { id: 'phone', title: 'Téléphone', detail: 'hors de la maison, par le tunnel WireGuard', tone: 'orange' },
        { id: 'guests', title: 'Invités', detail: 'la page invité seulement, par Tailscale Funnel', tone: 'orange' },
      ],
    },
  ],
}

export const SOFTWARE: SchemaDiagram = {
  id: 'software',
  title: 'Architecture logicielle',
  intro: 'Les services du mini PC (un conteneur chacun) et ce qu’ils se passent, de la caméra à l’écran.',
  tiers: [
    {
      id: 'sources',
      nodes: [{ id: 'cameras', title: 'Caméras Reolink', detail: 'un flux principal 4K et un flux léger par caméra', tone: 'green' }],
      link: 'RTSP',
    },
    {
      id: 'go2rtc',
      nodes: [{ id: 'go2rtc', title: 'go2rtc', detail: 'une seule connexion à chaque caméra, partagée : RTSP interne, MJPEG, image à l’instant', tone: 'accent' }],
      link: 'RTSP interne',
    },
    {
      id: 'motion',
      nodes: [{ id: 'motion', title: 'motion', detail: 'l’enregistreur : segments du flux principal (6 h), détection sur le flux léger, clips MP4', tone: 'accent' }],
      link: 'API interne : clips et événements',
    },
    {
      id: 'apps',
      nodes: [
        { id: 'sync', title: 'sync · House Sync (8081)', detail: 'copie clips et images sur le disque backup, écrit SQLite, sert cette page', tone: 'accent' },
        { id: 'api', title: 'api · House API et WebApp (8080)', detail: 'le direct relayé de go2rtc, les ordres aux équipements, lit la base', tone: 'accent' },
        { id: 'guest', title: 'guest · page invité (8090)', detail: 'le direct léger pour un lien donné ; éteinte par défaut', tone: 'muted' },
      ],
      link: 'écriture (sync) · lecture seule (api) · états partagés dans des fichiers',
    },
    {
      id: 'data',
      nodes: [
        { id: 'backup', title: 'Disque backup (data/backup)', detail: 'events.db (SQLite), clips, images', tone: 'muted' },
        { id: 'state', title: 'État de l’API (data/house)', detail: 'positions des lampes, zones, plan, clips sauvegardés, chauffage', tone: 'muted' },
      ],
      link: 'ordres de l’API',
    },
    {
      id: 'devices',
      nodes: [
        { id: 'poe', title: 'Switch PoE', detail: 'allumer ou couper chaque caméra', tone: 'green' },
        { id: 'hue', title: 'Pont Hue', detail: 'lampes, scènes, détecteurs ; flux d’événements gardé par sync', tone: 'green' },
        { id: 'kasa', title: 'Prise Kasa', detail: 'minuteur et chauffage automatique', tone: 'green' },
      ],
      link: 'sur l’hôte, hors Docker',
    },
    {
      id: 'host',
      nodes: [
        { id: 'power', title: 'power · services systemd', detail: 'puissance du processeur (RAPL), état des conteneurs Docker : un fichier que sync lit', tone: 'muted' },
        { id: 'certs', title: 'certs', detail: 'éphémère : crée la CA de la maison et le certificat du mini PC, puis s’arrête', tone: 'muted' },
      ],
    },
  ],
}

export const DIAGRAMS: SchemaDiagram[] = [HARDWARE, SOFTWARE]

export const SECTION_CLASS = 'flex flex-col gap-4 py-2'
export const INTRO_CLASS = 'text-[0.9rem] text-muted'
export const TIER_CLASS = 'grid grid-cols-1 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]'
export const NODE_CLASS = 'flex min-w-0 flex-col gap-1 rounded-lg border px-3 py-2 [overflow-wrap:anywhere]'
export const NODE_TITLE_CLASS = 'font-semibold'
export const NODE_DETAIL_CLASS = 'text-[0.8rem] text-muted'
export const LINK_CLASS = 'flex items-center justify-center gap-2 py-1 text-[0.8rem] text-muted'
export const ARROW_CLASS = 'text-[1.1rem] leading-none text-accent'
export const TONE_CLASSES: Record<string, string> = {
  accent: 'border-accent bg-card',
  green: 'border-green bg-card',
  orange: 'border-orange bg-card',
  muted: 'border-line bg-card',
}
export const ARROW_TEXT = '▼'
