export const TITLE = 'Freebox'
export const LOADING_TEXT = 'Lecture de la box…'
export const NOT_CONFIGURED_TEXT = 'La box n’est pas configurée : FREEBOX_APP_TOKEN est absent du .env du mini PC.'
export const UNAVAILABLE_TEXT = 'L’API ne répond pas.'
export const UNREACHABLE_TEXT = 'La box ne répond pas.'
export const SEND_ERROR_TEXT = 'L’ordre n’est pas parti (la box ne répond pas ou refuse).'

/** Relue à ce rythme : un changement fait ailleurs (appli Freebox) apparaît ainsi. */
export const POLL_MS = 12_000

export const WIFI_SWITCH_LABEL = 'WiFi de la box'
export const WIFI_ON_TEXT = 'Allumé'
export const WIFI_OFF_TEXT = 'Coupé'
export const WIFI_ON_STATE = 'Le WiFi est allumé.'
export const WIFI_OFF_STATE = 'Le WiFi est coupé.'
export const WIFI_BUSY_TEXT = 'Envoi à la box…'
export const CONFIRM_TEXT = 'Couper le WiFi ? Les appareils sans câble perdront le réseau.'
export const CONFIRM_YES = 'Couper'
export const CONFIRM_NO = 'Annuler'

export const SPEC_LABELS = { line: 'Ligne', address: 'Adresse IP', down: 'Débit descendant', up: 'Débit montant', uptime: 'Allumée depuis', firmware: 'Firmware' } as const
export const UNKNOWN = '–'

export const NO_DEVICE_TEXT = 'Aucun appareil.'
/** Connecté ou non (la pastille de la liste) : un appareil à bail statique reste dans la liste même éteint. */
export const ONLINE_LABEL = 'Connecté'
export const OFFLINE_LABEL = 'Hors ligne'
export const COLUMNS = ['État', 'Nom', 'Adresse IP', 'Bail', 'Type']

export const BOX_CLASS = 'mt-4 flex flex-col gap-3'
/** Un bloc de la box (WiFi, ligne, appareils) : la bordure vient de `StatusFrame`. */
export const BLOCK_CLASS = 'flex flex-col gap-3 p-3'
export const STACK_CLASS = 'flex flex-col gap-3'
export const BLOCK_TITLE_CLASS = 'text-[1.05rem] font-semibold'
export const WIFI_TITLE = 'WiFi'
export const WIFI_HELP = 'Allume ou coupe le WiFi de la box. Les appareils branchés par câble ne sont pas touchés.'
export const STATE_TITLE = 'État de la box'
export const DEVICES_TITLE = 'Appareils du réseau'
export const HEAD_CLASS = 'flex items-center justify-between gap-2'
export const NAME_CLASS = 'text-[1.05rem] font-semibold'
export const STATE_CLASS = 'text-[0.85rem] text-muted'
export const ERROR_CLASS = 'text-[0.9rem] text-danger'
export const CONFIRM_CLASS = 'flex flex-wrap items-center gap-2 text-[0.9rem]'
/** Dans l onglet Box la liste s étend sans barre interne (la page défile) ; dans l aperçu de la carte, elle défile dans son bloc. */
export const SCROLL_CLASS = 'overflow-x-auto'
export const COMPACT_SCROLL_CLASS = 'max-h-44 overflow-x-auto overflow-y-auto'
/** Sur grand écran, l'état et les appareils côte à côte ; sur téléphone une colonne. */
export const COLUMNS_CLASS = 'grid grid-cols-1 gap-3 lg:grid-cols-2'

export const GUESTS_POLL_MS = 30_000
export const GUESTS_TITLE = 'Appareils invités'
export const GUEST_COLUMNS = ['Nom', 'Adresse IP', 'Type', 'Première vue', 'Dernière vue', 'État', 'Exclu', '']
export const NO_GUEST_TEXT = 'Aucun invité connecté.'
export const GUEST_ONLINE = 'Connecté'
export const GUEST_OFFLINE = 'Hors ligne'
export const GUEST_EXCLUDED = 'Exclu'
export const GUEST_ADMITTED = '–'
export const EXCLUDE_TEXT = 'Exclure'
export const EXCLUDE_HINT = 'Ne coupe que le WiFi (un appareil branché par câble n’est pas touché). Le droit « Modification des réglages » de l’application est requis.'
export const READMIT_TEXT = 'Réadmettre'
export const ACTION_CLASS = 'flex flex-wrap items-center gap-2'
export const ACTION_ERRORS = {
  whitelist: 'La box est en liste blanche : l’exclusion n’est pas possible.',
  other: 'L’action a échoué : la box ne répond pas ou le droit « Modification des réglages » manque.',
} as const

export const LEASE_STATIC = 'IP fixe'
export const LEASE_DYNAMIC = 'IP dynamique'
