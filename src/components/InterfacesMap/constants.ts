import type { Column, Frame, MapArrow, MapLabel, Role, TextBox } from './types'

export const VIEW_BOX = '0 0 1210 1030'
export const ARIA_LABEL =
  'Architecture des interfaces : la WebApp et la page de House Sync importent le paquet @house/ui, documenté par Storybook ; la WebApp appelle House API, qui lit SQLite et le disque backup, relaie go2rtc et pilote le switch ; la page de House Sync appelle House Sync.'
export const MARKER_ID = 'interfaces-arrow'

/** Le Storybook de @house/ui, compilé dans public/storybook (npm run build:storybook) et servi avec le site. */
export const STORYBOOK_URL = '/storybook/index.html'
export const STORYBOOK_LABEL = 'Ouvrir le Storybook'
export const STORYBOOK_HINT = 'Les composants de @house/ui, un par un. Page vide ? Lance npm run build:storybook.'
export const STORYBOOK_CLASS = 'mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.9rem]'
export const STORYBOOK_LINK_CLASS = 'font-semibold text-camera underline decoration-dotted underline-offset-2 hover:text-fg'
export const STORYBOOK_HINT_CLASS = 'text-muted'

/** Une classe par propriété : l'ordre des classes Tailwind n'est pas garanti. */
export const FRAME_STROKE: Record<Role, string> = {
  app: 'stroke-camera',
  ui: 'stroke-pi',
  story: 'stroke-switch',
  api: 'stroke-backup',
  ext: 'stroke-muted',
}
export const CHIP_STROKE: Record<Role, string> = {
  app: 'stroke-camera/55',
  ui: 'stroke-pi/55',
  story: 'stroke-switch/55',
  api: 'stroke-backup/55',
  ext: 'stroke-muted/55',
}

export const FRAME_CLASS = 'fill-card stroke-2'
export const CHIP_CLASS = 'fill-bg stroke-[1.2]'
export const BOX_CLASS = 'fill-bg stroke-[1.5]'
export const BOX_DASHED_CLASS = 'fill-bg stroke-[1.5] [stroke-dasharray:5_4]'
export const TITLE_CLASS = 'fill-fg text-[15px] font-semibold'
export const SUB_CLASS = 'fill-muted text-[12px]'
export const GROUP_CLASS = 'fill-muted text-[11px] font-semibold uppercase tracking-wider'
export const CHIP_TEXT_CLASS = 'fill-fg font-mono text-[11.5px]'
export const BOX_TITLE_CLASS = 'fill-fg font-mono text-[11.5px] font-medium'
export const NOTE_CLASS = 'fill-muted text-[11px]'
export const LABEL_CLASS = 'fill-fg text-[11.5px]'
export const ARROW_CLASS = 'fill-none stroke-fg stroke-[1.6]'
export const ARROW_DASHED_CLASS = 'fill-none stroke-fg stroke-[1.6] [stroke-dasharray:6_4]'
export const MARKER_CLASS = 'fill-fg'

/** Largeur d'une pastille : ses caractères et un peu d'air. */
export const CHIP_CHAR_WIDTH = 6.9
export const CHIP_PADDING = 18
export const CHIP_HEIGHT = 24
export const CHIP_GAP = 7
/** Écart entre le bas d'un groupe et la légende suivante, et entre la légende et ses pastilles. */
export const GROUP_GAP = 22
export const LABEL_TO_CHIPS = 8
export const NOTE_GAP = 30

const API_Y = 660

export const FRAMES: Frame[] = [
  { id: 'web', x: 50, y: 20, w: 530, h: 235, role: 'app', title: 'WebApp · web/', sub: 'Vite, React, TypeScript · servie par House API sur le port 8080' },
  { id: 'sync', x: 640, y: 20, w: 510, h: 235, role: 'app', title: 'Page de House Sync · sync/web/', sub: 'Vite, React, TypeScript · servie par House Sync sur le port 8081' },
  { id: 'ui', x: 50, y: 320, w: 700, h: 270, role: 'ui', title: '@house/ui · ui/', sub: 'Composants dumb : aucun état, aucun appel réseau, tout par props · consommé en source' },
  { id: 'story', x: 830, y: 320, w: 320, h: 270, role: 'story', title: 'Storybook 10 · ui/.storybook', sub: 'npm run storybook (6006) · build-storybook' },
  { id: 'api', x: 50, y: API_Y, w: 800, h: 350, role: 'api', title: 'House API · api/', sub: 'Express 5, Node 24, TypeScript · HTTPS sur le port 8080 · lecture seule, sauf le PoE du switch' },
  {
    id: 'hs',
    x: 890,
    y: API_Y,
    w: 260,
    h: 150,
    role: 'ext',
    title: 'House Sync · sync/',
    sub: 'seul à écrire : base, clips, images',
    notes: [
      { text: 'copie les clips des enregistreurs', y: API_Y + 78 },
      { text: 'sert sa page sur le port 8081', y: API_Y + 98 },
    ],
  },
]

export const COLUMNS: Column[] = [
  {
    frame: 'web',
    x: 72,
    y: 86,
    maxW: 490,
    role: 'app',
    groups: [
      { label: 'Conteneurs', items: ['App', 'CameraMosaic', 'LiveTile', 'CameraCard', 'Timeline', 'PowerButton', 'ClipPlayer', 'SnapshotImage', 'KeyForm', 'ApiExplorer'] },
      { label: 'Lib', items: ['api.ts', 'useHouse.ts', 'usePower.ts', 'live.ts', 'format.ts'] },
    ],
  },
  {
    frame: 'sync',
    x: 662,
    y: 86,
    maxW: 470,
    role: 'app',
    groups: [
      { label: 'Conteneurs', items: ['App', 'TableSection', 'ClipsSection', 'MediaPanel', 'KeyForm'] },
      { label: 'Lib', items: ['api.ts', 'format.ts', 'totals.ts'] },
    ],
  },
  {
    frame: 'ui',
    x: 72,
    y: 400,
    maxW: 310,
    role: 'ui',
    groups: [
      { label: 'Base', items: ['Button', 'Tabs', 'SectionTitle', 'Notice', 'Page', 'PageHeader'] },
      { label: 'Formulaires', items: ['KeyForm'] },
      { label: 'Données', items: ['DataTable', 'Pager', 'Totals'] },
    ],
  },
  {
    frame: 'ui',
    x: 400,
    y: 400,
    maxW: 330,
    role: 'ui',
    groups: [
      { label: 'Médias', items: ['SnapshotImage', 'ClipPlayer', 'MediaPanel'] },
      { label: 'Caméras', items: ['CameraCard', 'CameraTile', 'Timeline'] },
      { label: 'Pages', items: ['ApiExplorer', 'PageFrame'] },
    ],
    note: 'tokens.css : les couleurs de la maison (thème Tailwind)',
  },
  {
    frame: 'story',
    x: 852,
    y: 400,
    maxW: 280,
    role: 'story',
    groups: [
      { label: 'Une story = un dossier', items: ['Cas.stories.tsx', 'Cas.fr.md', 'Cas.en.md', 'Story.source.md'] },
      { label: 'Sections, de la base à la page', items: ['Base', 'Formulaires', 'Données', 'Médias', 'Caméras', 'Pages'] },
    ],
    note: 'source.ts · i18n.ts · decorators.tsx',
  },
]

/** Les couches de House API, de gauche à droite dans l'ordre d'une requête. */
const LAYERS: { title: string; lines: string[] }[] = [
  { title: 'middleware/', lines: ['requireKey', 'session', 'errorHandler'] },
  { title: 'routes/', lines: ['welcome · auth', 'cameras · events', 'snapshots · live', 'poe'] },
  { title: 'services/', lines: ['cameras · events', 'snapshots', 'live (go2rtc)', 'poe'] },
  { title: 'repositories/', lines: ['cameras', 'events', 'snapshots'] },
]

const LAYER_STEP = 188
const LAYER_W = 168

export const BOXES: TextBox[] = [
  ...LAYERS.map((layer, i): TextBox => ({ id: `layer-${i}`, x: 72 + i * LAYER_STEP, y: API_Y + 80, w: LAYER_W, h: 152, role: 'api', ...layer })),
  { id: 'db', x: 448, y: API_Y + 268, w: LAYER_W, h: 60, role: 'api', title: 'db/database.ts', lines: ['SQLite en lecture seule'] },
  { id: 'files', x: 260, y: API_Y + 268, w: LAYER_W, h: 60, role: 'api', title: 'lib/backupFiles.ts', lines: ['clips et images, Range'] },
  { id: 'switch', x: 636, y: API_Y + 268, w: LAYER_W, h: 60, role: 'api', title: 'lib/switchClient.ts', lines: ['page web du switch'] },
  { id: 'static', x: 72, y: API_Y + 268, w: LAYER_W, h: 60, role: 'api', title: 'static', lines: ['web/dist de la WebApp'] },
  { id: 'ext-db', x: 890, y: 835, w: 260, h: 42, role: 'ext', title: 'events.db et disque backup', lines: [], dashed: true },
  { id: 'ext-go2rtc', x: 890, y: 895, w: 260, h: 42, role: 'ext', title: 'go2rtc et enregistreurs', lines: [], dashed: true },
  { id: 'ext-switch', x: 890, y: 955, w: 260, h: 42, role: 'ext', title: 'Switch ES208GP', lines: [], dashed: true },
]

export const ARROWS: MapArrow[] = [
  ...LAYERS.slice(0, -1).map((_, i): MapArrow => ({ id: `chain-${i}`, d: `M${72 + i * LAYER_STEP + LAYER_W + 2} ${API_Y + 156} H${72 + (i + 1) * LAYER_STEP - 2}` })),
  { id: 'web-api', d: 'M50 150 H28 V800 H48' },
  { id: 'sync-hs', d: 'M1150 150 H1182 V735 H1152' },
  { id: 'web-ui', d: 'M300 318 V258' },
  { id: 'sync-ui', d: 'M720 318 V258' },
  { id: 'story-ui', d: 'M828 455 H752' },
  { id: 'hs-db', d: 'M1020 812 V833', dashed: true },
  // Les arrivées de chaque couche vers ses ressources : routes vers les fichiers, dépôts vers SQLite, service poe vers le switch.
  { id: 'routes-files', d: 'M344 894 V926' },
  { id: 'repos-db', d: 'M720 894 V903 H532 V926' },
  { id: 'services-switch', d: 'M560 894 V916 H720 V926' },
  // Vers l'extérieur : les dépôts lisent la base, le service live relaie go2rtc, le client du switch le pilote.
  { id: 'repos-ext-db', d: 'M806 816 H830 V856 H888', dashed: true },
  { id: 'services-go2rtc', d: 'M532 738 V726 H866 V916 H888', dashed: true },
  { id: 'switch-ext', d: 'M806 958 H826 V976 H888', dashed: true },
]

export const LABELS: MapLabel[] = [
  { id: 'web-api', x: 18, y: 480, text: 'HTTP · X-House-Key, cookie de session', anchor: 'middle', rotate: -90 },
  { id: 'sync-hs', x: 1196, y: 450, text: 'HTTP · clé, session', anchor: 'middle', rotate: -90 },
  { id: 'web-ui', x: 308, y: 292, text: 'utilisé par' },
  { id: 'sync-ui', x: 728, y: 292, text: 'utilisé par' },
  { id: 'story-ui', x: 790, y: 445, text: 'documente', anchor: 'middle' },
  { id: 'hs-db', x: 1028, y: 826, text: 'écrit' },
  { id: 'repos-ext-db', x: 878, y: 849, text: 'lit', anchor: 'middle' },
  { id: 'services-go2rtc', x: 700, y: 720, text: 'relaie le direct', anchor: 'middle' },
  { id: 'switch-ext', x: 848, y: 968, text: 'pilote', anchor: 'middle' },
]
