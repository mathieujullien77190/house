import type { ShutterCommand } from '@/types'

export const TITLE = 'Volets roulants'
export const LOADING_TEXT = 'Lecture des volets…'
export const NOT_CONFIGURED_TEXT = 'Aucun volet configuré : SHUTTERS est vide dans le .env du mini PC.'
export const UNAVAILABLE_TEXT = 'Les volets ne répondent pas.'
/** Affiché tant que SHUTTERS_ESP_URL est absent : l'ordre est noté mais aucun signal radio ne part. */
export const MOCK_TEXT =
  'Mode simulation : aucun signal radio n’est envoyé (SHUTTERS_ESP_URL est absent du .env). Les ordres sont seulement notés dans le journal.'
export const SEND_ERROR_TEXT = 'L’ordre n’est pas parti (l’ESP32 ne répond pas).'
export const NEVER_TEXT = 'Aucun ordre envoyé pour l’instant.'
export const LAST_LABEL = 'Dernier ordre'
/** Les deux cases de l'action automatique, pour les volets qui l'ont (tous par défaut). */
export const AUTO_OPEN_LABEL = 'Ouvrir au lever du soleil'
export const AUTO_CLOSE_LABEL = 'Fermer au coucher du soleil'
export const AUTO_ERROR_TEXT = 'Le réglage n’a pas été enregistré.'

/** « Fermer à moitié » (volets qui ont un temps de fermeture) : monte à fond puis redescend de moitié. */
export const HALF_LABEL = '◧ Fermer à moitié'
export const HALF_RUNNING_TEXT = 'Ouvre à fond, puis ferme à moitié… (Stop l’arrête)'

/** Les boutons, dans l'ordre : monter, stop, descendre. */
export const COMMANDS: { id: ShutterCommand; label: string }[] = [
  { id: 'up', label: '▲ Monter' },
  { id: 'stop', label: '■ Stop' },
  { id: 'down', label: '▼ Descendre' },
]
export const COMMAND_LABELS: Record<ShutterCommand, string> = { up: 'Monter', stop: 'Stop', down: 'Descendre' }

/** Relu à ce rythme : un ordre donné depuis un autre appareil apparaît ainsi dans la liste. */
export const POLL_MS = 10_000
/** Pendant un « Fermer à moitié », relu plus vite pour voir la fin. */
export const POLL_RUNNING_MS = 2_000

export const BOX_CLASS = 'mt-4 flex flex-col gap-3'
export const LIST_CLASS = 'grid grid-cols-1 gap-3 lg:grid-cols-3'
export const CARD_CLASS = 'flex flex-col gap-2 p-3'
export const NAME_CLASS = 'text-[1.05rem] font-semibold'
export const BUTTONS_CLASS = 'flex flex-wrap gap-2'
export const LAST_CLASS = 'text-[0.85rem] text-muted'
export const ERROR_CLASS = 'text-[0.9rem] text-danger'
