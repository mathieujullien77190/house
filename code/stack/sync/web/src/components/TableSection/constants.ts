export const PAGE_SIZE = 20
/** Ce que contient chaque table, en une phrase. */
export const DESCRIPTIONS: Record<string, string> = {
  last_images: 'Pour chaque caméra, l’adresse de sa dernière image chez l’enregistreur.',
  live_streams: 'Pour chaque caméra, le flux go2rtc du direct, que l’API relaie.',
  snapshots: 'Une image par caméra et par minute, gardée quelques jours : ce que la frise de la WebApp montre entre deux événements.',
}

export const OPEN_LABEL = 'voir'
export const NULL_TEXT = 'null'

export const LINK_CLASS = 'text-accent underline decoration-dotted underline-offset-2'
export const CAMERA_CLASS = 'whitespace-nowrap font-semibold text-accent'
export const BADGE_CLASS = 'inline-block whitespace-nowrap rounded-full bg-green/15 px-2 font-semibold text-green'
export const MUTED_CLASS = 'whitespace-normal text-muted lg:whitespace-nowrap'
export const NUM_CLASS = 'whitespace-normal tabular-nums lg:whitespace-nowrap'
export const MEDIA_CLASS = 'inline-flex flex-wrap items-center gap-2'
