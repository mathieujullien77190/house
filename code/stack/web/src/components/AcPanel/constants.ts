import type { AcMode } from '@/types'

export const TITLE = 'Climatisations'
export const LOADING_TEXT = 'Lecture des climatisations…'
export const NOT_CONFIGURED_TEXT = 'Aucune climatisation configurée : AC_UNITS est absent du .env du mini PC.'
export const UNAVAILABLE_TEXT = 'Les climatisations ne répondent pas.'
export const UNIT_UNREACHABLE_TEXT = 'Le module Wi-Fi de cette unité ne répond pas.'
export const SEND_ERROR_TEXT = 'L’ordre n’est pas parti (le module ne répond pas).'
/** L'interrupteur marche / arrêt : son nom pour les lecteurs d'écran, et le texte à côté. */
export const TOGGLE_LABEL = 'Marche / arrêt'
export const TOGGLE_ON_TEXT = 'On'
export const TOGGLE_OFF_TEXT = 'Off'
export const ON_TEXT = 'Allumée'
export const OFF_TEXT = 'Éteinte'
export const ROOM_LABEL = 'pièce'
export const TARGET_LABEL = 'Consigne'
export const FAN_LABEL = 'Ventilateur'
export const VANE_LABEL = 'Ailette haut / bas'
export const WIDE_VANE_LABEL = 'Ailette gauche / droite'
export const MODE_LABEL = 'Mode'
/** La consigne : de 16 à 31 °C, par pas de 0,5. */
export const TARGET_MIN = 16
export const TARGET_MAX = 31
export const TARGET_STEP = 0.5

export const MODES: { id: AcMode; label: string }[] = [
  { id: 'heat', label: '🔥 Chaud' },
  { id: 'cool', label: '❄ Froid' },
  { id: 'dry', label: '💧 Sec' },
  { id: 'fan', label: '🌀 Ventil.' },
  { id: 'auto', label: '⟳ Auto' },
]
export const MODE_LABELS: Record<AcMode, string> = { heat: 'Chaud', cool: 'Froid', dry: 'Sec', fan: 'Ventilation', auto: 'Auto' }

export const FANS: { id: string; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'quiet', label: 'Silence' },
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: '4', label: '4' },
]

/** L'ailette haut / bas (le salon) : le va-et-vient, auto, puis 5 positions, de la plus haute (1) à la plus basse (5). */
export const VANES: { id: string; label: string }[] = [
  { id: 'swing', label: 'Va-et-vient' },
  { id: 'auto', label: 'Auto' },
  { id: '1', label: '1 haut' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: '4', label: '4' },
  { id: '5', label: '5 bas' },
]

/** L'ailette gauche / droite (les chambres) : le va-et-vient, puis le flux d'air à gauche, au milieu à gauche, au milieu, au milieu à droite et à droite. */
export const WIDE_VANES: { id: string; label: string }[] = [
  { id: 'swing', label: 'Va-et-vient' },
  { id: 'left', label: 'Gauche' },
  { id: 'left-center', label: 'Milieu gauche' },
  { id: 'center', label: 'Milieu' },
  { id: 'right-center', label: 'Milieu droite' },
  { id: 'right', label: 'Droite' },
]

/** L'ailette que chaque climatisation règle : **les chambres** l'ailette gauche / droite, **le salon** (et toute autre) l'ailette haut / bas. */
export const HORIZONTAL_VANE_UNITS = ['chambre-invite', 'chambre-matou']

/** Relu à ce rythme : un changement fait à la télécommande apparaît ainsi. */
export const POLL_MS = 10_000

export const BOX_CLASS = 'mt-4 flex flex-col gap-3'
export const LIST_CLASS = 'grid grid-cols-1 gap-3 lg:grid-cols-3'
export const CARD_CLASS = 'flex flex-col gap-3 rounded-lg border border-line bg-card p-3'
export const HEAD_CLASS = 'flex items-center justify-between gap-2'
export const TOGGLE_WRAP_CLASS = 'flex items-center gap-2'
export const TOGGLE_TEXT_CLASS = 'min-w-7 font-mono text-[0.9rem]'
/** L'interrupteur : une piste et une pastille qui glisse ; une classe complète par état (jamais deux classes pour la même propriété). */
export const TOGGLE_ON_CLASS =
  'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-line bg-accent transition-colors disabled:cursor-default disabled:opacity-60'
export const TOGGLE_OFF_CLASS =
  'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-line bg-line transition-colors disabled:cursor-default disabled:opacity-60'
export const KNOB_ON_CLASS = 'inline-block h-5 w-5 translate-x-6 rounded-full bg-white shadow transition-transform'
export const KNOB_OFF_CLASS = 'inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform'
export const NAME_CLASS = 'text-[1.05rem] font-semibold'
export const STATE_CLASS = 'text-[0.85rem] text-muted'
export const BUTTONS_CLASS = 'flex flex-wrap gap-2'
export const GROUP_LABEL_CLASS = 'text-[0.8rem] text-muted'
export const TARGET_CLASS = 'flex items-center gap-3'
export const TARGET_VALUE_CLASS = 'min-w-16 text-center font-mono text-[1.3rem]'
export const ERROR_CLASS = 'text-[0.9rem] text-danger'
