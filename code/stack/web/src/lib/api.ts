// Le client de House API : chaque appel porte la clé dans l'en-tête X-House-Key.
// La clé n'est jamais dans le code : elle vient de l'utilisateur, la saisie ouvre une session par cookie (voir /auth).
import type { CameraPower, CameraRow, EventRow, GuestInfo, HueAutomation, HueRoom, HueSensor, HueState, PlugState } from '@/types'

export const KEY_STORAGE = 'house-key'
const KEY_HEADER = 'X-House-Key'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const isKeyRefused = (error: unknown): boolean => error instanceof ApiError && error.status === 401

const request = async (key: string, path: string): Promise<Response> => {
  const res = await fetch(path, { headers: { [KEY_HEADER]: key } })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `${path} : HTTP ${res.status}`)
  return res
}

export const checkKey = (key: string): Promise<Response> => request(key, '/auth')
export const fetchLive = async (key: string): Promise<CameraRow[]> => (await request(key, '/direct')).json()
/** Les 200 derniers événements ; avec une fenêtre (secondes), ceux d'une caméra qui la touchent (1000 au plus). */
export interface EventsWindow {
  camera: string
  from?: number
  to?: number
  limit?: number
}
export const fetchEvents = async (key: string, window?: EventsWindow): Promise<EventRow[]> => {
  const query = new URLSearchParams()
  if (window) {
    query.set('camera', window.camera)
    if (window.from !== undefined) query.set('from', String(Math.floor(window.from)))
    if (window.to !== undefined) query.set('to', String(Math.ceil(window.to)))
    if (window.limit !== undefined) query.set('limit', String(window.limit))
  }
  return (await request(key, query.size > 0 ? `/events?${query.toString()}` : '/events')).json()
}
/** Sauvegarde (à garder pour toujours) ou libère le clip d'un événement. */
export const setClipSaved = async (key: string, id: string, saved: boolean): Promise<void> => {
  const res = await fetch(`/clips/${encodeURIComponent(id)}/saved`, {
    method: 'PUT',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ saved }),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/clips : HTTP ${res.status}`)
}
/** Les clips sauvegardés (à garder pour toujours), les plus récents d'abord. */
export const fetchSavedEvents = async (key: string): Promise<EventRow[]> => (await request(key, '/events?saved=1')).json()
/** De quoi bâtir le lien de la page invité (sa clé, son port, son adresse publique) ; échoue (503) sans page invité configurée. */
export const fetchGuest = async (key: string): Promise<GuestInfo> => (await request(key, '/guest')).json()
export const fetchPower = async (key: string): Promise<CameraPower[]> => (await request(key, '/poe')).json()

/** Allume (on) ou éteint une caméra : House API coupe ou rend le PoE de son port sur le switch. */
export const setCameraPower = async (key: string, camera: string, on: boolean): Promise<CameraPower> => {
  const res = await fetch(`/poe/${encodeURIComponent(camera)}`, {
    method: 'POST',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ on }),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/poe : HTTP ${res.status}`)
  return res.json()
}

/** L'état de la prise connectée (503 sans prise configurée, 502 si elle ne répond pas). */
export const fetchPlug = async (key: string): Promise<PlugState> => (await request(key, '/plug')).json()

/** Allume (on) ou éteint la prise connectée ; avec `minutes`, l'allume pour ce temps puis elle s'éteint toute seule. */
export const setPlug = async (key: string, on: boolean, minutes?: number): Promise<PlugState> => {
  const res = await fetch('/plug', { method: 'POST', headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' }, body: JSON.stringify(minutes === undefined ? { on } : { on, minutes }) })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/plug : HTTP ${res.status}`)
  return res.json()
}

/** Les pièces du pont Hue et leurs lampes (503 sans pont configuré). */
export const fetchLights = async (key: string): Promise<HueRoom[]> => (await request(key, '/hue')).json()

/** Allume, éteint ou règle une pièce (rooms) ou une lampe (lights) ; rend les pièces à jour. */
export const setHue = async (key: string, kind: 'rooms' | 'lights', id: string, state: HueState): Promise<HueRoom[]> => {
  const res = await fetch(`/hue/${kind}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/hue : HTTP ${res.status}`)
  return res.json()
}

/** Les règles d'automatisation du pont, en phrases (503 sans pont configuré). */
export const fetchAutomations = async (key: string): Promise<HueAutomation[]> => (await request(key, '/hue/automations')).json()

/** Les détecteurs de mouvement du pont, avec leur température et leur luminosité (503 sans pont configuré). */
export const fetchSensors = async (key: string): Promise<HueSensor[]> => (await request(key, '/hue/sensors')).json()

/** Les positions des ampoules sur le plan, gardées par l'API (503 sans pont configuré). */
export const fetchLampPositions = async (key: string): Promise<Record<string, { x: number; y: number }>> => (await request(key, '/hue/positions')).json()

/** Garde ces positions d'ampoules (les autres restent) ; rend l'ensemble. */
export const saveLampPositions = async (key: string, changes: Record<string, { x: number; y: number }>): Promise<Record<string, { x: number; y: number }>> => {
  const res = await fetch('/hue/positions', {
    method: 'PUT',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/hue/positions : HTTP ${res.status}`)
  return res.json()
}

/** Les instants (secondes) où House Sync a gardé une image de cette caméra, entre from et to. */
export const fetchSnapshotTimes = async (key: string, camera: string, from: number, to: number): Promise<number[]> =>
  (await request(key, `/snapshots?camera=${encodeURIComponent(camera)}&from=${Math.floor(from)}&to=${Math.ceil(to)}`)).json()

/** L'image la plus proche d'un instant, avec son identifiant (son instant exact ; 404 s’il n’y en a pas à cinq minutes près). */
export const fetchSnapshot = async (key: string, camera: string, at: number): Promise<{ blob: Blob; takenAt: number | null }> => {
  const res = await request(key, `/snapshot?camera=${encodeURIComponent(camera)}&at=${Math.floor(at)}`)
  const takenAt = Number(res.headers.get('X-Snapshot-At'))
  return { blob: await res.blob(), takenAt: Number.isFinite(takenAt) && takenAt > 0 ? takenAt : null }
}
/** Un service quelconque, pour l'explorateur de l'API : le statut et le corps tel quel. */
export const callService = async (key: string, path: string): Promise<{ status: number; body: string }> => {
  const res = await fetch(path, { headers: { [KEY_HEADER]: key } })
  return { status: res.status, body: await res.text() }
}

/**
 * Les versions précédentes gardaient la clé dans l'onglet. Elle n'est plus gardée nulle part : la session est un
 * cookie signé (HttpOnly, 30 jours) posé par /auth, que le navigateur renvoie tout seul.
 */
export const clearStoredKey = (): void => {
  try {
    sessionStorage.removeItem(KEY_STORAGE)
  } catch {
    // Stockage indisponible (navigation privée) : rien à effacer.
  }
}
