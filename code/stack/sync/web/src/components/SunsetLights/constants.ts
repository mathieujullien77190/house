export const LOAD_ERROR_TEXT = 'Le réglage de l’allumage au coucher du soleil n’a pas pu être lu.'
export const SAVE_ERROR_TEXT = 'Ce réglage n’a pas pu être enregistré. Réessaie.'
export const SWITCH_LABEL = 'Allumer les lampes au coucher du soleil'
export const SWITCH_HINT = 'Chaque jour, le salon, la cuisine et l’entrée s’allument à pleine puissance. House Sync calcule l’heure du coucher (le pont Hue n’a pas de position).'
export const NEXT_LABEL = 'Prochain allumage'
export const NONE_TEXT = 'aucun (coupé)'
export const OFFSET_LABEL = 'Décalage'
export const OPTIONS = [
  { id: 'on', label: 'Activé' },
  { id: 'off', label: 'Coupé' },
] as const

export const WRAP_CLASS = 'flex flex-col'
export const ROW_CLASS = 'flex flex-col gap-1 border-b border-line py-3 last:border-b-0'
export const LABEL_CLASS = 'text-[0.85rem] text-fg'
export const HINT_CLASS = 'text-[0.78rem] text-muted'
export const VALUE_CLASS = 'font-mono text-[0.85rem] text-fg'
export const ERROR_CLASS = 'text-[0.85rem] text-danger'
