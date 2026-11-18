export const TITLE = 'Page invité du réseau'
export const LOADING_TEXT = 'Lecture de l’adresse…'
export const UNAVAILABLE_TEXT = 'L’API ne répond pas.'
export const NOT_CONFIGURED_TEXT = 'La page n’est pas configurée : LAN_KEY est absente du .env du mini PC (16 caractères au moins).'
export const QR_LABEL = 'QR code de la page Chez Matou (clé comprise)'
export const QR_HINT = 'À scanner depuis le Wi-Fi de la maison : le lien contient la clé de la page.'
export const COPY_LABEL = 'Copier'
export const COPIED_LABEL = 'Copié ✓'
export const FAILED_LABEL = 'Copie impossible'
export const COPY_RESET_MS = 2_500
export const STATE_TITLE = 'Ce que la page permet'
export const SWITCHES_NOTE = 'Les interrupteurs sont dans House Sync (Réglages, « Page invité du réseau »).'
export const PREVIEW_TITLE = 'Aperçu en direct'
export const PREVIEW_LABEL = 'Aperçu de la page Chez Matou'
export const ON_TEXT = 'Activé'
export const OFF_TEXT = 'Coupé'
/** Les fonctions de la page, dans l'ordre : le général d'abord. */
export const FUNCTIONS: { key: 'enabled' | 'cameras' | 'shutters' | 'lights' | 'ac'; label: string }[] = [
  { key: 'enabled', label: 'Page' },
  { key: 'cameras', label: 'Caméras des perruches' },
  { key: 'shutters', label: 'Volets' },
  { key: 'lights', label: 'Lampes' },
  { key: 'ac', label: 'Climatisations' },
]

export const PANEL_CLASS = 'flex flex-col gap-4'
export const QR_BOX_CLASS = 'flex flex-col items-center gap-2 self-center rounded-lg bg-white p-3'
export const HINT_CLASS = 'text-center text-[0.85rem] text-muted'
export const ADDRESS_ROW_CLASS = 'flex flex-wrap items-center gap-3'
export const ADDRESS_CLASS = 'min-w-0 flex-1 break-all font-mono text-[0.8rem] text-fg underline'
export const STATE_CLASS = 'flex flex-col'
export const STATE_ROW_CLASS = 'flex items-center justify-between gap-3 border-b border-line py-2 text-[0.9rem] last:border-b-0'
export const NOTE_CLASS = 'text-[0.85rem] text-muted'
export const PREVIEW_CLASS = 'h-[560px] w-full rounded-lg border border-line bg-bg'
export const QR_SIZE = 224
export const QR_MARGIN = 4
