import type { ApiService } from './types'

export const SERVICES: ApiService[] = [
  { path: '/welcome', description: 'Le service de bienvenue : l’API est là. Sans clé.', secured: false },
  { path: '/auth', description: 'Vérifie la clé : ok si elle est bonne, 401 sinon.', secured: true },
  { path: '/direct', description: 'L’adresse de la page du direct de chaque caméra (Frigate).', secured: true },
  { path: '/image', description: 'L’adresse de la dernière image de chaque caméra (Frigate).', secured: true },
  { path: '/events?last=1', description: 'Le dernier événement de chaque caméra.', secured: true },
  { path: '/events', description: 'Les 200 derniers événements, du plus récent au plus ancien.', secured: true },
  { path: '/snapshots?camera=portail', description: 'Les instants où House Sync a gardé une image de la caméra (une par minute).', secured: true },
]

export const INTRO = 'Chaque service est un GET. Clique pour l’appeler avec ta clé (en-tête X-House-Key) et voir sa réponse.'
export const CLIPS_NOTE = '/clips/<id> renvoie la vidéo d’un événement (mp4) et /snapshot?camera=…&at=… l’image la plus proche d’un instant (jpeg) : pas de JSON, voir l’onglet Caméras.'
export const RESULT_TITLE = 'Réponse'
export const KEY_BADGE = 'clé'

export const LAYOUT_CLASS = 'mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]'
export const INTRO_CLASS = 'mt-3 text-[0.9rem] text-muted'
export const LIST_CLASS = 'm-0 list-none space-y-1.5 p-0'
export const SERVICE_CLASS = 'block w-full cursor-pointer rounded-lg border px-3 py-2 text-left hover:border-accent'
export const SERVICE_IDLE_CLASS = 'border-line bg-card'
export const SERVICE_ACTIVE_CLASS = 'border-accent bg-card'
export const PATH_CLASS = 'font-mono text-[0.85rem]'
export const BADGE_CLASS = 'ml-2 rounded-full border border-line px-1.5 text-[0.7rem] text-muted'
export const DESCRIPTION_CLASS = 'mt-0.5 text-[0.8rem] text-muted'
export const NOTE_CLASS = 'mt-2 text-[0.8rem] text-muted'
export const RESULT_CLASS = 'rounded-lg border border-line bg-card p-3'
export const RESULT_HEAD_CLASS = 'mb-2 flex items-center justify-between text-[0.85rem] text-muted'
export const STATUS_OK_CLASS = 'font-semibold text-accent'
export const STATUS_KO_CLASS = 'font-semibold text-danger'
export const BODY_CLASS = 'm-0 max-h-[32rem] overflow-auto whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-relaxed'
export const EMPTY_CLASS = 'text-[0.85rem] text-muted'
export const EMPTY_TEXT = 'Choisis un service à gauche.'
export const BUSY_TEXT = 'Appel en cours…'
