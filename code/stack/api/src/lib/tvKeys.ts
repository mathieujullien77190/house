// Les touches de la télécommande, par leurs noms de toujours (ceux de l'ancienne télécommande réseau de la Freebox, gardés pour la WebApp), et leur KeyCode Android (KeyEvent, remotemessage.proto).
export const TV_KEY_CODES = {
  power: 26,
  list: 173, // KEYCODE_DVR
  tv: 170,
  '0': 7,
  '1': 8,
  '2': 9,
  '3': 10,
  '4': 11,
  '5': 12,
  '6': 13,
  '7': 14,
  '8': 15,
  '9': 16,
  back: 4,
  swap: 229, // KEYCODE_LAST_CHANNEL
  info: 165,
  epg: 172, // KEYCODE_GUIDE
  mail: 65, // KEYCODE_ENVELOPE
  media: 284, // KEYCODE_ALL_APPS
  help: 259,
  options: 82, // KEYCODE_MENU
  pip: 171, // KEYCODE_WINDOW
  vol_inc: 24,
  vol_dec: 25,
  mute: 164, // KEYCODE_VOLUME_MUTE (KEYCODE_MUTE, 91, coupe le micro)
  prgm_inc: 166,
  prgm_dec: 167,
  prev: 88,
  bwd: 89,
  play: 85, // KEYCODE_MEDIA_PLAY_PAUSE
  fwd: 90,
  next: 87,
  up: 19,
  right: 22,
  down: 20,
  left: 21,
  home: 3,
  free: 3, // la touche « Free » de la télécommande du Pop : l'accueil de la Freebox (KEYCODE_HOME)
  ok: 23, // KEYCODE_DPAD_CENTER
  red: 183,
  green: 184,
  blue: 186,
  yellow: 185,
  rec: 130,
} as const

/** Les applications lancées par un lien (message `RemoteAppLinkLaunchRequest` du protocole, comme l'intégration Home Assistant « Android TV Remote »). */
export const TV_APPS = {
  netflix: 'https://www.netflix.com/title',
  disney: 'https://www.disneyplus.com',
} as const

/** KEYCODE_WAKEUP : réveille le Player s'il est en veille (sans effet s'il est allumé), à la différence de `power` qui bascule. */
export const WAKEUP_KEY_CODE = 224
/** Les touches qui réveillent d'abord le Player : celles qui ouvrent quelque chose (l'accueil, une application) ne servent à rien sur un Player en veille. */
export const WAKE_FIRST: readonly TvKey[] = ['free', 'netflix', 'disney']

export type TvApp = keyof typeof TV_APPS
export type TvKey = keyof typeof TV_KEY_CODES | TvApp

export const TV_KEYS = [...Object.keys(TV_KEY_CODES), ...Object.keys(TV_APPS)] as TvKey[]

export const isTvKey = (value: unknown): value is TvKey => typeof value === 'string' && (Object.hasOwn(TV_KEY_CODES, value) || Object.hasOwn(TV_APPS, value))

/** Vrai pour une touche qui lance une application au lieu d'envoyer un KeyCode. */
export const isTvApp = (key: TvKey): key is TvApp => Object.hasOwn(TV_APPS, key)
