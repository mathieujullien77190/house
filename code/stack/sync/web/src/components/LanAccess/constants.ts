import type { LanAccessKey } from './types'

export const LOAD_ERROR_TEXT = 'Les réglages de la page invité du réseau n’ont pas pu être lus.'
export const SAVE_ERROR_TEXT = 'Ce réglage n’a pas pu être enregistré. Réessaie.'
export const ADDRESS_LABEL = 'Adresse (à ouvrir depuis le Wi-Fi de la maison, la clé est en plus dans le lien du QR code de la WebApp)'
export const KEY_NOTE = 'La clé de la page (LAN_KEY) reste dans le .env du mini PC : elle n’est jamais affichée ici.'
export const OPTIONS = [
  { id: 'on', label: 'Activé' },
  { id: 'off', label: 'Coupé' },
] as const

/** Les interrupteurs : le général d’abord (coupé, tout est refusé), puis chaque fonction. */
export const SWITCHES: readonly { key: LanAccessKey; label: string; hint: string }[] = [
  { key: 'enabled', label: 'Page invité du réseau', hint: 'Interrupteur général : coupé, la page et toutes ses fonctions sont refusées.' },
  { key: 'cameras', label: 'Voir les deux caméras des perruches', hint: 'Seulement voliere-interieur et voliere-exterieur, en direct léger.' },
  { key: 'shutters', label: 'Ouvrir et fermer les volets', hint: 'Monter, descendre, stop.' },
  { key: 'lights', label: 'Allumer et éteindre les lampes', hint: 'Par zone, sans réglage de luminosité.' },
  { key: 'ac', label: 'Gérer les climatisations', hint: 'Marche, consigne, mode et ventilateur (pas les ailettes).' },
]

export const WRAP_CLASS = 'flex flex-col'
export const ROW_CLASS = 'flex flex-col gap-1 border-b border-line py-3 last:border-b-0'
export const LABEL_CLASS = 'text-[0.85rem] text-fg'
export const HINT_CLASS = 'text-[0.78rem] text-muted'
export const ADDRESS_CLASS = 'break-all font-mono text-[0.85rem] text-fg'
export const ERROR_CLASS = 'text-[0.85rem] text-danger'
