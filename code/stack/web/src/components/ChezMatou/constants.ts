import type { AcMode, ShutterCommand } from '@/types'
import type { LanProblem } from './types'

export const TITLE = 'Chez Matou'
export const LOADING_TEXT = 'Chargement…'
export const CAMERAS_TITLE = 'Les perruches'
export const SHUTTERS_TITLE = 'Volets'
export const LIGHTS_TITLE = 'Lumières'
export const AC_TITLE = 'Climatisation'
export const EMPTY_TEXT = 'Rien n’est ouvert sur cette page pour le moment.'
export const ERROR_TEXT = 'L’ordre n’est pas parti. Réessaie.'
export const NO_IMAGE_TEXT = 'Image indisponible'

export const PROBLEM_TEXT: Record<LanProblem, string> = {
  locked: 'Il manque la clé de la page : ouvre le lien ou le QR code que tu as reçu.',
  disabled: 'Cette page est désactivée pour le moment.',
  outside: 'Cette page ne s’ouvre que depuis le Wi-Fi de la maison.',
  unconfigured: 'Cette page n’est pas encore configurée.',
  unreachable: 'La maison ne répond pas. Réessaie dans un instant.',
}

/** Les ordres de volet que la page envoie (les mêmes que la WebApp, sans « fermer à moitié »). */
export const COMMANDS_ALLOWED: string[] = ['up', 'down', 'stop'] satisfies ShutterCommand[]
/** Les seuls modes de clim qu'on peut choisir ici : chaud et froid (l'API refuse les autres). */
export const AC_MODES_ALLOWED: AcMode[] = ['heat', 'cool']
/** La consigne que la page laisse régler : de 18 à 24 °C, bornes comprises (blocage côté page seulement, l'API ne le vérifie pas). */
export const AC_TARGET_RANGE = { min: 18, max: 24 }

/** Rafraîchit l'état de la page à ce rythme. */
export const POLL_MS = 5_000
/** Si le flux s'arrête, un nouveau jeton est demandé après ce délai. */
export const RETRY_MS = 3_000

export const PAGE_CLASS = 'mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6'
export const HEAD_CLASS = 'flex flex-col gap-1'
export const TITLE_CLASS = 'text-2xl font-bold text-fg'
export const SECTION_CLASS = 'flex flex-col gap-3'
/** Les caméras : une colonne sur téléphone, deux dès `lg:` ; une caméra en portrait garde sa largeur (le rapport 9/16 de la WebApp) et se centre. */
export const CAMERAS_CLASS = 'grid grid-cols-1 items-start gap-3 lg:grid-cols-2'
export const TILE_PORTRAIT_CLASS = '[--big-h:530px] mx-auto w-[min(100%,calc(var(--big-h)*9/16))]'
export const LIST_CLASS = 'flex flex-col gap-3'
export const ERROR_CLASS = 'text-[0.85rem] text-danger'
