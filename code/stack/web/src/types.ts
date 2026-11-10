/** Ce que renvoient les services de House API. */

/** Paysage (le direct tel quel) ou portrait (caméra posée de côté : l'image est tournée d'un quart de tour horaire pour être droite). Réglé dans House Sync. */
export type Orientation = 'landscape' | 'portrait'

/** Un repère posé sur l'image d'une caméra : une icône de caméra qui ouvre la caméra `target` ; sa place en parts de l'image (x de 0 à gauche à 1 à droite, y de 0 en haut à 1 en bas). */
export interface CameraMarker {
  target: string
  x: number
  y: number
}

/** Le mode pluie d'une caméra (réglé dans House Sync) : éteint, pluie ou pluie forte. */
export type RainMode = 'off' | 'rain' | 'heavy'

export interface CameraRow {
  camera: string
  url: string
  orientation: Orientation
  /** Le niveau de pluie qui s'applique à la caméra (le mode pluie de House Sync et la météo). */
  rain?: RainMode
}

export interface EventRow {
  id: string
  camera: string
  label: string
  /** Secondes depuis 1970 (horodatage de l'enregistreur). */
  started_at: number
  ended_at: number | null
  /** Chemin du service clips, ou null si le clip n'a pas été copié. */
  clip: string | null
  /** La copie légère du clip (H.264, 720p, lisible partout), ou null si elle n'existe pas encore. */
  clip_h264: string | null
  /** Le son du clip (AAC, à part de la vidéo), joué avec elle ; null s'il n'y en a pas. */
  clip_audio: string | null
  /** Secondes depuis 1970 : le début réel du clip (il précède l'événement), ou null (anciens clips). */
  clip_started_at: number | null
  /** Sauvegardé : jamais effacé par le ménage (les autres clips le sont après la durée de garde réglée dans House Sync). */
  saved: boolean
  /** La note du clip (« renard »), posée depuis la Home ; vide s'il n'y en a pas. */
  note: string
  /** L'emoji du clip (🦊), montré sur la carte de la maison ; vide ou absent s'il n'y en a pas. */
  emoji?: string
  /** L'orientation qu'avait la caméra au début de l'événement : un clip pris avant que la caméra soit tournée reste en paysage. */
  orientation: Orientation
}

/** L'alimentation d'une caméra, lue sur le switch (service poe). */
export interface CameraPower {
  camera: string
  port: number
  /** Le PoE du port est activé. */
  on: boolean
  /** Le switch alimente bien la caméra. */
  powered: boolean
  watts: number
  /** go2rtc reçoit son flux : elle a fini de démarrer. */
  streaming: boolean
}

export type TabId = 'home' | 'cameras' | 'lights' | 'shutters' | 'ac' | 'plug' | 'api'

export type AcMode = 'heat' | 'cool' | 'dry' | 'fan' | 'auto'

/** Une climatisation Mitsubishi, telle que House API la décrit (les champs sont vides quand le module ne répond pas : `reachable` faux). */
export interface AcUnit {
  id: string
  name: string
  reachable: boolean
  power: boolean
  mode: AcMode | null
  /** La consigne en °C. */
  targetTemp: number | null
  /** La température de la pièce en °C, lue par l'unité. */
  roomTemp: number | null
  /** 'auto', 'quiet' ou '1' à '4'. */
  fan: string | null
  /** L'ailette : 'auto', '1' (haut) à '5' (bas) ou 'swing' (balayage). */
  vane: string | null
  /** L'ailette gauche / droite : left, left-center, center, right-center, right ou swing ; null si l'unité ne la donne pas. */
  wideVane: string | null
}

/** Ce qu'on change d'une climatisation : seuls les champs donnés bougent. */
export interface AcPatch {
  on?: boolean
  mode?: AcMode
  /** La consigne en °C, par pas de 0,5. */
  temperature?: number
  fan?: string
  vane?: string
  wideVane?: string
}

/** La prise connectée (TP-Link Kasa), telle que House API la décrit. */
export interface PlugState {
  alias: string
  model: string
  on: boolean
  /** Signal WiFi en dBm. */
  rssi: number
  /** Secondes depuis l'allumage, 0 éteinte. */
  onTime: number
  /** Secondes avant que le minuteur de la prise ne l'éteigne, null sans minuteur. */
  timerSeconds: number | null
  /** L'option « éteindre si le détecteur intérieur voit un mouvement » est armée. */
  offOnMotion: boolean
}

/** Les réglages du chauffage automatique de la prise et l'état de la règle, tels que House API les décrit (GET /plug/heating). */
export interface HeatingStatus {
  enabled: boolean
  thresholdC: number
  minutes: number
  cooldownMinutes: number
  lastActivationAt: number | null
  nextAllowedAt: number | null
  /** La température de la volière, null si inconnue. */
  temperature: number | null
  night: boolean
  cold: boolean
}

/** Ce que PUT /plug/heating accepte (tout est facultatif). */
export type HeatingSettingsBody = Partial<
  Pick<HeatingStatus, 'enabled' | 'thresholdC' | 'minutes' | 'cooldownMinutes'>
>

/** Les trois ordres d'un volet roulant (le Somfy RTS ne rend aucune position). */
export type ShutterCommand = 'up' | 'down' | 'stop'

/** Un volet roulant et son dernier ordre (GET /shutters). */
export interface ShutterInfo {
  id: string
  name: string
  lastCommand: ShutterCommand | null
  /** Secondes depuis 1970. */
  lastAt: number | null
  /** L'action automatique : null si le volet n'en a pas, sinon ses deux options (ouvrir au lever du soleil, fermer à son coucher), activées ou non. */
  auto: ShutterAuto | null
  /** Le temps (secondes) que le volet met à se fermer en entier ; null : pas de « Fermer à moitié » pour lui. */
  closeSeconds?: number | null
  /** « Fermer à moitié » est en cours (ouvrir à fond, puis fermer à moitié). */
  halfRunning?: boolean
}

/** Les deux options de l'action automatique d'un volet. */
export interface ShutterAuto {
  open: boolean
  close: boolean
}

/** Les volets ; `mock` : simulation, aucun ordre radio n'est envoyé. */
export interface ShuttersState {
  mock: boolean
  shutters: ShutterInfo[]
}

/** Une lampe du pont Hue. */
export interface HueLight {
  id: string
  name: string
  on: boolean
  bri: number | null
  reachable: boolean
  /** La couleur actuelle de la lampe en #rrggbb (à pleine luminosité) ; null pour une lampe qui ne change pas de couleur. */
  color?: string | null
}

/** Une pièce du pont Hue et ses lampes. */
export interface HueRoom {
  id: string
  name: string
  on: boolean
  bri: number | null
  lights: HueLight[]
}

/** Une règle d'automatisation du pont, en phrases (un horaire ou un détecteur de mouvement). */
export interface HueAutomation {
  id: string
  name: string
  enabled: boolean
  kind: 'horaire' | 'capteur'
  lines: string[]
}

/** Un détecteur de mouvement Hue avec sa température et sa luminosité. */
export interface HueSensor {
  id: string
  name: string
  presence: boolean | null
  /** Le dernier changement de l'état de mouvement (ISO, UTC), ou null. */
  presenceSince: string | null
  temperature: number | null
  lux: number | null
  dark: boolean | null
  battery: number | null
  reachable: boolean
}

/** Un changement : allumer ou éteindre (on), régler la luminosité (bri, 1 à 254). */
export interface HueState {
  on?: boolean
  bri?: number
}

/** Une caméra avec tout ce que la page sait d'elle. */
export interface Camera {
  name: string
  /** L'orientation actuelle de la caméra (son direct). */
  orientation: Orientation
  /** Le mode pluie (éteint, pluie, pluie forte) : allumé, la détection est coupée et une image est gardée toutes les 5 s. */
  rain?: RainMode
}

/** De quoi bâtir le lien de la page invité (GET /guest). */
export interface GuestInfo {
  key: string
  port: number
  /** L'adresse publique, vide tant que la page n'est pas ouverte à internet. */
  url: string
}

