import type { ServoCommand, ServoField } from './types'

export const TEST_LABEL = 'Tester'
export const ORIGIN_LABEL = 'Origine'
export const TEST_ERROR_TEXT = 'L’ESP32 des servos ne répond pas : le test n’est pas parti.'
export const URL_LABEL = 'Adresse de l’ESP32 des servos'
export const SAVE_ERROR_TEXT = 'Ce réglage n’a pas pu être enregistré (valeur refusée ou House Sync muet). Réessaie.'
export const LOAD_ERROR_TEXT = 'Les réglages des servos n’ont pas pu être lus.'

/** Les volets à servos (leur numéro dans SHUTTERS de l'API) : Salon, PC, porte. */
export const SUBTITLE_CLASS = 'mt-4 mb-1 border-b border-line pb-1 text-[0.95rem] font-semibold text-fg'
export const SHUTTERS: readonly { id: string; label: string }[] = [
  { id: '2', label: 'Salon' },
  { id: '5', label: 'PC' },
  { id: '6', label: 'Porte' },
]

/** Les trois ordres d'un volet, dans l'ordre de la WebApp. */
export const COMMANDS: readonly { id: ServoCommand; label: string }[] = [
  { id: 'up', label: 'Monter' },
  { id: 'down', label: 'Descendre' },
  { id: 'stop', label: 'Stop' },
]

/** Les champs d'un ordre : texte, bornes (celles que House Sync vérifie) et pas du champ de saisie. */
export const FIELDS: readonly { id: ServoField; label: string; min: number; max?: number; step: number }[] = [
  { id: 'channel', label: 'Canal (0-15)', min: 0, max: 15, step: 1 },
  { id: 'start', label: 'Départ (°)', min: -90, max: 90, step: 1 },
  { id: 'end', label: 'Arrivée (°)', min: -90, max: 90, step: 1 },
  { id: 'speed', label: 'Vitesse (°/s, 0 = max)', min: 0, step: 1 },
  { id: 'hold', label: 'Attente (s)', min: 0, step: 0.1 },
]

export const ORDER_CLASS = 'flex flex-col gap-2 border-b border-line py-4 last:border-b-0'
export const NAME_CLASS = 'font-mono font-semibold'
export const GRID_CLASS = 'grid grid-cols-2 gap-x-4 gap-y-3 lg:max-w-5xl lg:grid-cols-[repeat(5,1fr)_auto]'
/** Le bouton « Tester » en bout de ligne : en bas de sa cellule, aligné sur les champs. */
export const TEST_CELL_CLASS = 'flex items-end gap-2'
export const FIELD_CLASS = 'flex flex-col gap-1'
export const LABEL_CLASS = 'text-[0.85rem] text-muted'
export const INPUT_CLASS = 'min-h-10 w-full rounded border border-line bg-card px-2 py-1 font-mono lg:min-h-8'
export const URL_INPUT_CLASS = 'min-h-10 w-full rounded border border-line bg-card px-2 py-1 font-mono lg:min-h-8 lg:max-w-xl'
export const ERROR_CLASS = 'text-[0.85rem] text-red-600'
