import { createElement, type ReactNode } from 'react'
import { LuVolumeX } from 'react-icons/lu'
import type { TvKey } from '@/types'

export const TITLE = 'Box TV'
export const LOADING_TEXT = 'Lecture de l’état du Player…'
export const UNAVAILABLE_TEXT = 'L’API ne répond pas.'
export const SEND_ERROR_TEXT = 'Le Player est éteint ou injoignable.'
export const SEND_FAILED_TEXT = 'La touche n’est pas partie.'
/** Sans TV_HOST côté API (jamais en service : l'adresse a une valeur par défaut). */
export const NOT_CONFIGURED_TITLE = 'Télécommande non configurée'
export const NOT_CONFIGURED_NOTE = 'TV_HOST (192.168.1.47 par défaut) doit être l’adresse IP du Player.'
export const NOT_PAIRED_TITLE = 'Associer le Player'
export const PAIRING_INTRO = 'Le Player doit faire confiance à ce site, une seule fois :'
export const PAIRING_STEPS = [
  'Allume la TV et le Player.',
  'Clique sur « Associer » : un code s’affiche sur la TV.',
  'Saisis ce code (6 caractères) puis valide.',
] as const
export const START_LABEL = 'Associer'
export const STARTING_LABEL = 'Connexion au Player…'
export const CODE_LABEL = 'Code affiché sur la TV'
export const CODE_LENGTH = 6
export const SUBMIT_LABEL = 'Valider'
export const VALIDATING_LABEL = 'Vérification…'
export const RESTART_LABEL = 'Recommencer'
export const START_OFF_TEXT = 'Le Player est éteint ou injoignable : allume la TV et le Player, puis réessaie.'
export const SLOW_TEXT = 'Le Player ne répond pas (délai dépassé). Réessaie.'
export const BAD_CODE_TEXT = 'Code faux : relis-le sur la TV.'
export const EXPIRED_TEXT = 'L’association a expiré : clique de nouveau sur « Associer ».'
export const PAIR_FAILED_TEXT = 'L’association a échoué.'
export const UNPAIR_FAILED_TEXT = 'La dissociation a échoué.'
export const NOT_PAIRED_KEY_TEXT = 'Le Player n’est plus associé.'

/** Relu à ce rythme : le Player s'allume et s'éteint sans passer par la WebApp. */
export const POLL_MS = 10_000
/** Un appui maintenu aussi longtemps envoie la touche en appui long. */
export const LONG_PRESS_MS = 600
/** Le retour visuel à l'appui. */
export const FLASH_MS = 180

/** Les icônes de marche / arrêt et de muet : react-icons, comme celles du plan. */
const KEY_ICON_CLASS = 'size-5'

export interface KeySpec {
  id: TvKey
  label: ReactNode
  aria: string
}

const digit = (n: number): KeySpec => ({ id: String(n) as TvKey, label: String(n), aria: `Chiffre ${n}` })

export const TOP_KEYS: KeySpec[] = [
  { id: 'free', label: 'Free', aria: 'Free (accueil de la Freebox)' },
  { id: 'netflix', label: 'Netflix', aria: 'Netflix' },
  { id: 'disney', label: 'Disney+', aria: 'Disney plus' },
]
/** « Arrêter » : éteint le Player (la touche marche / arrêt, envoyée par le réseau) ; au-dessus des applications ; seul sur sa rangée (pleine largeur), ou à moitié avec « Retour » (téléphone). */
export const STOP_KEYS: KeySpec[] = [{ id: 'power', label: 'Arrêter', aria: 'Arrêter le Player' }]
export const VOLUME_KEYS: KeySpec[] = [
  { id: 'vol_inc', label: '+', aria: 'Volume plus' },
  { id: 'vol_dec', label: '−', aria: 'Volume moins' },
]
export const PROGRAM_KEYS: KeySpec[] = [
  { id: 'prgm_inc', label: '+', aria: 'Programme suivant' },
  { id: 'prgm_dec', label: '−', aria: 'Programme précédent' },
]
export const VOLUME_LABEL = 'Volume'
export const PROGRAM_LABEL = 'Programme'
/** La croix : neuf cases d'une grille de trois colonnes, null pour une case vide. */
export const PAD_KEYS: (KeySpec | null)[] = [
  { id: 'back', label: '↩', aria: 'Retour' },
  { id: 'up', label: '▲', aria: 'Haut' },
  { id: 'home', label: '⌂', aria: 'Accueil' },
  { id: 'left', label: '◀', aria: 'Gauche' },
  { id: 'ok', label: 'OK', aria: 'OK' },
  { id: 'right', label: '▶', aria: 'Droite' },
  null,
  { id: 'down', label: '▼', aria: 'Bas' },
  null,
]
export const DIGIT_KEYS: (KeySpec | null)[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit)
export const ZERO_ROW: (KeySpec | null)[] = [
  null,
  digit(0),
  { id: 'mute', label: createElement(LuVolumeX, { className: KEY_ICON_CLASS, 'aria-hidden': true }), aria: 'Muet' },
]

/** Une colonne qui tient dans 360 px, centrée et limitée à 24 rem sur le bureau. */
export const PANEL_CLASS = 'mx-auto mt-2 flex w-full max-w-96 flex-col gap-2'
export const REMOTE_CLASS = 'flex flex-col gap-2 p-2'
export const GRID1_CLASS = 'grid grid-cols-1 gap-2'
export const GRID2_CLASS = 'grid grid-cols-2 gap-2'
export const GRID3_CLASS = 'grid grid-cols-3 gap-2'
export const GRID4_CLASS = 'grid grid-cols-4 gap-2'
export const GROUP_CLASS = 'flex flex-col gap-2'
export const GROUP_LABEL_CLASS = 'text-center text-[0.7rem] leading-none text-muted'
export const KEY_CLASS = 'min-h-10 w-full touch-manipulation select-none [-webkit-touch-callout:none] active:scale-95'
export const KEY_TEXT_CLASS = 'flex items-center justify-center text-lg leading-none'
export const ERROR_CLASS = 'text-center text-[0.9rem] text-danger'
export const STEPS_CLASS = 'flex list-decimal flex-col gap-1 pl-5 text-[0.9rem]'
export const STEP_CURRENT_CLASS = 'font-semibold text-fg'
export const CODE_FORM_CLASS = 'flex gap-2'
export const CODE_INPUT_CLASS =
  'min-h-12 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-center font-mono text-xl uppercase tracking-widest text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
export const WIDE_BUTTON_CLASS = 'min-h-10 w-full touch-manipulation'
export const NOTE_CLASS = 'text-[0.85rem] text-muted'
export const EMPTY_CLASS = 'block min-h-10'

export const BACK_LABEL = 'Quitter la télécommande'
export const BACK_TEXT = 'Retour'

/** Les chaînes en un toucher, sous le pavé numérique : le numéro est tapé chiffre par chiffre. Numéros de la grille Free (à changer ici si elle change). */
export const CHANNELS: { label: string; number: string }[] = [
  { label: 'TMC', number: '10' },
  { label: 'BFM', number: '15' },
  { label: 'LCI', number: '26' },
]
/** Délai entre deux chiffres d'un numéro de chaîne (ms) : assez long pour que le Player les prenne l'un après l'autre. */
export const CHANNEL_DIGIT_MS = 350
