/** Les blocs de la page Réglages : un bloc général, un bloc par caméra (titre = son nom) dont les rangées portent ces titres, puis la page invité. */
export const SECTION_RECORDING = 'Enregistrement : clips et images'
export const SECTION_DETECTION = 'Détection du mouvement'
export const SECTION_LIVE = 'Direct dans la WebApp'
export const SECTION_GUEST = 'Page invité'
export const SECTION_SERVOS = 'Volets'
export const SECTION_SUNSET = 'Allumage au coucher du soleil'
export const CLIPS_LABEL = 'Clips vidéo'
/** La durée de garde, pour toutes les caméras : au-delà, un clip non sauvegardé, les images, le journal des lampes, les événements sans clip et les fusions sont effacés (une fois par jour). */
export const RETENTION_LABEL = 'Durée de garde (clips, images, événements de la caméra)'
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
/** Paysage (le direct tel quel) ou portrait (caméra posée de côté : l'image est tournée d'un quart de tour horaire). Les clips déjà pris gardent l'orientation qu'avait la caméra à ce moment. */
export const ORIENTATION_LABEL = 'Orientation'
export const ORIENTATION_OPTIONS = [
  { id: 'landscape', label: 'Paysage' },
  { id: 'portrait', label: 'Portrait' },
] as const
/** Le mode pluie : la pluie fait trop bouger l'image pour la détection. Sur ON, quand la météo dit pluie ou pluie forte, les clips s'arrêtent (la détection est coupée) et une image est gardée toutes les 5 s ; quand il ne pleut plus, les réglages ci-dessus reviennent. Sur OFF, on ne fait rien. La WebApp montre le symbole sur la caméra. */
/** La recherche des yeux qui brillent : la nuit, des reflets d'yeux comptent comme un mouvement et sont entourés en rouge sur la vidéo. */
export const EYES_LABEL = 'Recherche des yeux (la nuit)'
export const EYES_OPTIONS = [
  { id: 'off', label: 'OFF' },
  { id: 'on', label: 'ON' },
] as const
/** Le clip lié : un mouvement ou des yeux vus par cette caméra déclenchent aussi un clip sur les autres caméras de son groupe (LINKS dans le compose : voliere-toit et voliere-interieur). Sans effet sur une caméra hors groupe. */
export const LINK_LABEL = 'Clip sur la caméra liée'
export const LINK_OPTIONS = [
  { id: 'off', label: 'OFF' },
  { id: 'on', label: 'ON' },
] as const
/** Le mode vent : comme le mode pluie, quand le vent dépasse 20 km/h (la météo de House Sync) : pas de clips, une image toutes les 5 s. */
export const WIND_LABEL = 'Mode vent'
export const RAIN_LABEL = 'Mode pluie'
export const RAIN_OPTIONS = [
  { id: 'off', label: 'OFF' },
  { id: 'on', label: 'ON' },
] as const
/** Ce qui est actif maintenant, écrit sous le choix. */
export const RAIN_NOW_TEXT = { wind: '💨 Vent fort en ce moment : mode vent actif', rain: '🌧️ Pluie en ce moment : mode pluie actif', heavy: '☔ Pluie forte en ce moment : mode pluie actif', fog: '🌫️ Brouillard en ce moment : mode pluie actif' } as const
/** Le petit icône à côté du nom d'une caméra **en mode pluie** (il pleut et le mode s'applique) : 🌧️ pluie, ☔ pluie forte. Rien quand le mode est allumé sans pluie. */
export const RAIN_CLOUD = { wind: '💨', rain: '🌧️', heavy: '☔', fog: '🌫️' } as const
export const RAIN_CLOUD_HINT = { wind: 'Mode vent actif : vent fort', rain: 'Mode pluie actif : il pleut', heavy: 'Mode pluie actif : pluie forte', fog: 'Mode pluie actif : brouillard' } as const
/** Les curseurs de cadence : le direct 4K et le léger, sur un écran de 1024 px et plus (PC) puis en dessous (téléphone). */
export const FPS_SLIDERS = [
  { key: 'live_fps', label: 'Direct 4K · PC' },
  { key: 'live_fps_mobile', label: 'Direct 4K · téléphone' },
  { key: 'light_fps', label: 'Direct léger · PC' },
  { key: 'light_fps_mobile', label: 'Direct léger · téléphone' },
] as const
/** Le curseur de sensibilité du mouvement : de 1 (les petits mouvements sont ignorés) à 5 (très sensible : un chat, un oiseau, la nuit). */
/** Le feuillage : à partir de ce nombre de zones vues sur au moins 30 % des images, le mouvement est étiqueté « feuillage » (vert dans la frise de la WebApp). */
export const FOLIAGE_LABEL = 'Feuillage : nombre de zones à partir duquel le mouvement est du feuillage'
export const FOLIAGE_MIN = 0
export const FOLIAGE_MAX = 60
export const foliageText = (zones: number): string => (zones === 0 ? 'coupé' : `${zones} zones ou plus`)
/** La pluie : à partir de ce nombre total de zones hautes (au moins n % de la hauteur de l'image) vues sur tout le mouvement, il est étiqueté « pluie » (bleu dans la frise). */
export const STREAK_ZONES_LABEL = 'Pluie : nombre moyen de zones hautes par minute à partir duquel c’est de la pluie'
export const STREAK_ZONES_MIN = 0
export const STREAK_ZONES_MAX = 60
export const streakZonesText = (zones: number): string => (zones === 0 ? 'coupé' : `${zones} zones par minute en moyenne ou plus`)
export const STREAK_HEIGHT_LABEL = 'Pluie : hauteur minimale d’une zone (en % de la hauteur de l’image)'
export const STREAK_HEIGHT_MIN = 1
export const STREAK_HEIGHT_MAX = 100
export const streakHeightText = (percent: number): string => `${percent} % de la hauteur`
export const SENSITIVITY_LABEL = 'Sensibilité du mouvement'
export const SENSITIVITY_MIN = 1
export const SENSITIVITY_MAX = 5
export const MIN_SECONDS_LABEL = 'Durée minimale d’un mouvement'
export const MIN_SECONDS_MIN = 0
export const MIN_SECONDS_MAX = 30
export const minSecondsText = (seconds: number): string => (seconds === 0 ? 'aucune' : `${seconds} s`)
export const SENSITIVITY_TEXTS: Record<number, string> = { 1: 'faible', 2: 'moyenne −', 3: 'normale', 4: 'élevée', 5: 'très élevée' }
/** L'interrupteur de la page invité : coupée, elle ferme son port (injoignable de partout) ; les deux boutons la coupent et la remettent. */
export const GUEST_POWER_LABEL = 'Page invité'
export const GUEST_POWER_OPTIONS = [
  { id: 'on', label: 'En ligne' },
  { id: 'off', label: 'Coupée' },
] as const
/** Le curseur de la page invité : un seul réglage pour les vignettes et la caméra agrandie (4K), PC et téléphone confondus. */
export const GUEST_FPS_LABEL = 'Images par seconde (page publique et Chez Matou)'
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
  { id: '5', label: '5 s' },
  { id: '10', label: '10 s' },
  { id: '15', label: '15 s' },
  { id: '30', label: '30 s' },
  { id: '60', label: '1 min' },
  { id: '120', label: '2 min' },
  { id: '300', label: '5 min' },
] as const
export const ROW_CLASS = 'flex flex-col gap-3 border-b border-line py-4 last:border-b-0'
export const NAME_CLASS = 'font-mono font-semibold'
export const GROUP_CLASS = 'flex flex-col items-start gap-1'
export const LABEL_CLASS = 'text-[0.85rem] text-muted'
