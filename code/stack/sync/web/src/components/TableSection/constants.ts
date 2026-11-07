export const PAGE_SIZE = 20
/** Ce que contient chaque table, en une phrase. */
export const DESCRIPTIONS: Record<string, string> = {
  last_images: 'Pour chaque caméra, l’adresse de sa dernière image chez l’enregistreur.',
  live_streams: 'Pour chaque caméra, le flux go2rtc du direct, que l’API relaie.',
  snapshots: 'Une image par caméra et par minute, gardée quelques jours : ce que la frise de la WebApp montre entre deux événements.',
}

/** Les tables dont la ligne ne montre que les colonnes principales : le reste est dans le détail qui s'ouvre au clic. */
export const MAIN_COLUMNS: Record<string, string[]> = { guest_visits: ['id', 'started_at', 'ip', 'origin', 'cle', 'camera', 'path'] }
export const DETAILS_CLASS = 'm-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 font-mono text-[0.78rem]'
export const DETAIL_LABEL_CLASS = 'm-0 text-muted'
export const DETAIL_VALUE_CLASS = 'm-0 [overflow-wrap:anywhere]'
export const OPEN_LABEL = 'voir'
export const NULL_TEXT = 'null'

export const LINK_CLASS = 'text-accent underline decoration-dotted underline-offset-2'
export const CAMERA_CLASS = 'whitespace-nowrap font-semibold text-accent'
export const BADGE_CLASS = 'inline-block whitespace-nowrap rounded-full bg-green/15 px-2 font-semibold text-green'
export const MUTED_CLASS = 'whitespace-normal text-muted lg:whitespace-nowrap'
/** Une adresse IP (même une IPv6 longue) ne passe jamais à la ligne : le tableau défile dans son bloc si besoin. */
export const IP_CLASS = 'whitespace-nowrap font-mono'
export const NUM_CLASS = 'whitespace-normal tabular-nums lg:whitespace-nowrap'
export const MEDIA_CLASS = 'inline-flex flex-wrap items-center gap-2'

/** Ce que le filtre « valeur » choisit, selon la colonne de la table. */
export const MATCH_LABELS: Record<'camera' | 'name' | 'cle', string> = { camera: 'Caméra', name: 'Matériel Hue', cle: 'Clé' }
export const MATCH_ALL: Record<'camera' | 'name' | 'cle', string> = { camera: 'Toutes', name: 'Tous', cle: 'Toutes' }
export const DATE_LABEL = 'Date'
export const CLEAR_LABEL = 'Effacer les filtres'
