export const TITLE = 'Sauvegarde par caméra'
export const DESCRIPTION = 'Garder ou non les clips vidéo sur le disque backup, et le rythme des images gardées pour la frise.'
export const CLIPS_LABEL = 'Clips vidéo'
export const CLIPS_OPTIONS = [
  { id: 'always', label: 'Toujours' },
  { id: 'night', label: 'La nuit' },
  { id: 'off', label: 'Jamais' },
] as const
export const FPS_LABEL = 'Direct 4K'
export const LIGHT_FPS_LABEL = 'Direct léger'
export const FPS_MIN = 1
export const FPS_MAX = 25
export const FPS_UNIT = ' images/s'
export const FPS_FULL_TEXT = 'toutes'
export const SLIDER_CLASS = 'w-48 accent-accent'
export const VALUE_CLASS = 'min-w-[5.5rem] font-mono text-[0.85rem]'
export const SNAPSHOT_LABEL = 'Une image toutes les'
export const SNAPSHOT_OPTIONS = [
  { id: '30', label: '30 s' },
  { id: '60', label: '1 min' },
  { id: '120', label: '2 min' },
  { id: '300', label: '5 min' },
] as const
export const FPS_NOTE = 'Direct (4K ou léger) : moins d’images par seconde, c’est moins de travail pour le mini PC et moins de débit ; le direct en cours repart quand on change le réglage.'
export const NOTE = 'La nuit : de 30 min avant le coucher du soleil à 30 min après son lever (calculé pour la maison). Hors des clips gardés, les mouvements restent sur la frise, sans vidéo. Les clips déjà gardés ne sont pas effacés.'
export const ROW_CLASS = 'flex flex-col gap-2 border-b border-line py-3 last:border-b-0 lg:flex-row lg:items-center lg:gap-4'
export const NAME_CLASS = 'min-w-[7rem] font-mono font-semibold'
export const GROUP_CLASS = 'flex flex-wrap items-center gap-2'
export const LABEL_CLASS = 'text-[0.85rem] text-muted'
