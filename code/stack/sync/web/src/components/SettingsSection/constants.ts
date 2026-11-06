export const TITLE = 'Sauvegarde par caméra'
export const DESCRIPTION = 'Garder ou non les clips vidéo sur le disque backup, et le rythme des images gardées pour la frise.'
export const CLIPS_LABEL = 'Clips vidéo'
export const CLIPS_OPTIONS = [
  { id: 'always', label: 'Toujours' },
  { id: 'night', label: 'La nuit' },
  { id: 'off', label: 'Jamais' },
] as const
/** Les curseurs de cadence : le direct 4K et le léger, sur un écran de 1024 px et plus (PC) puis en dessous (téléphone). */
export const FPS_SLIDERS = [
  { key: 'live_fps', label: 'Direct 4K · PC' },
  { key: 'live_fps_mobile', label: 'Direct 4K · téléphone' },
  { key: 'light_fps', label: 'Direct léger · PC' },
  { key: 'light_fps_mobile', label: 'Direct léger · téléphone' },
] as const
export const FPS_MIN = 1
export const FPS_MAX = 25
export const FPS_UNIT = ' images/s'
export const FPS_FULL_TEXT = 'toutes'
export const SLIDER_CLASS = 'w-full accent-accent'
export const SLIDERS_CLASS = 'grid grid-cols-1 gap-x-8 gap-y-3 lg:max-w-3xl lg:grid-cols-2'
export const SLIDER_GROUP_CLASS = 'flex flex-col gap-1'
export const SLIDER_HEAD_CLASS = 'flex items-baseline justify-between gap-2'
export const CHOICES_CLASS = 'flex flex-wrap gap-x-8 gap-y-3'
export const VALUE_CLASS = 'font-mono text-[0.85rem]'
export const SNAPSHOT_LABEL = 'Une image toutes les'
export const SNAPSHOT_OPTIONS = [
  { id: '30', label: '30 s' },
  { id: '60', label: '1 min' },
  { id: '120', label: '2 min' },
  { id: '300', label: '5 min' },
] as const
export const FPS_NOTE =
  'Direct (4K ou léger) : moins d’images par seconde, c’est moins de travail pour le mini PC et moins de débit ; le direct en cours repart quand on change le réglage. « Téléphone » : les écrans de moins de 1024 px ; le 4K pèse environ 17 Mb/s à 10 images/s, trop pour un téléphone en Wi-Fi ou en VPN (image à moitié grise).'
export const NOTE = 'La nuit : de 30 min avant le coucher du soleil à 30 min après son lever (calculé pour la maison). Hors des clips gardés, les mouvements restent sur la frise, sans vidéo. Les clips déjà gardés ne sont pas effacés.'
export const ROW_CLASS = 'flex flex-col gap-3 border-b border-line py-4 last:border-b-0'
export const NAME_CLASS = 'font-mono font-semibold'
export const GROUP_CLASS = 'flex flex-col items-start gap-1'
export const LABEL_CLASS = 'text-[0.85rem] text-muted'
