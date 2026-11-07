/** Les sujets de la page Réglages, dans l’ordre : chacun regroupe le même réglage pour toutes les caméras. */
export const SECTION_RECORDING = 'Enregistrement : clips et images'
export const SECTION_DETECTION = 'Détection du mouvement'
export const SECTION_LIVE = 'Direct dans la WebApp'
export const SECTION_GUEST = 'Page invité'
export const CLIPS_LABEL = 'Clips vidéo'
/** La durée de garde des clips, pour toutes les caméras : au-delà, un clip non sauvegardé est effacé du disque. */
export const RETENTION_LABEL = 'Durée de garde des clips (toutes les caméras)'
export const RETENTION_OPTIONS = [
  { id: '7', label: '7 jours' },
  { id: '15', label: '15 jours' },
  { id: '30', label: '30 jours' },
  { id: '60', label: '60 jours' },
  { id: '90', label: '90 jours' },
  { id: '180', label: '180 jours' },
] as const
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
/** Le curseur de sensibilité du mouvement : de 1 (les petits mouvements sont ignorés) à 5 (très sensible : un chat, un oiseau, la nuit). */
export const SENSITIVITY_LABEL = 'Sensibilité du mouvement'
export const SENSITIVITY_MIN = 1
export const SENSITIVITY_MAX = 5
export const SENSITIVITY_TEXTS: Record<number, string> = { 1: 'faible', 2: 'moyenne −', 3: 'normale', 4: 'élevée', 5: 'très élevée' }
/** L'interrupteur de la page invité : coupée, elle ferme son port (injoignable de partout) ; les deux boutons la coupent et la remettent. */
export const GUEST_POWER_LABEL = 'Page invité'
export const GUEST_POWER_OPTIONS = [
  { id: 'on', label: 'En ligne' },
  { id: 'off', label: 'Coupée' },
] as const
/** Le curseur de la page invité : un seul réglage pour les vignettes et la caméra agrandie (4K), PC et téléphone confondus. */
export const GUEST_FPS_LABEL = 'Page invité · images par seconde (toutes les caméras, PC et téléphone)'
export const SAVE_ERROR_TEXT = 'Ce réglage n’a pas pu être enregistré : House Sync ne répond pas. Réessaie.'
export const LOAD_ERROR_TEXT = 'Les réglages n’ont pas pu être lus.'
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
export const ROW_CLASS = 'flex flex-col gap-3 border-b border-line py-4 last:border-b-0'
export const NAME_CLASS = 'font-mono font-semibold'
export const GROUP_CLASS = 'flex flex-col items-start gap-1'
export const LABEL_CLASS = 'text-[0.85rem] text-muted'
