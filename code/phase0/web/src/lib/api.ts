// Le client de House API : chaque appel porte la clé dans l'en-tête X-House-Key.
// La clé n'est jamais dans le code : elle vient de l'utilisateur, gardée dans l'onglet (sessionStorage).
import type { CameraPower, CameraRow, EventRow } from '@/types'

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
export const fetchClip = async (key: string, path: string): Promise<Blob> => (await request(key, path)).blob()

/** Les instants (secondes) où House Sync a gardé une image de cette caméra, entre from et to. */
export const fetchSnapshotTimes = async (key: string, camera: string, from: number, to: number): Promise<number[]> =>
  (await request(key, `/snapshots?camera=${encodeURIComponent(camera)}&from=${Math.floor(from)}&to=${Math.ceil(to)}`)).json()

/** L'image la plus proche d'un instant (404 s'il n'y en a pas à deux minutes près). */
export const fetchSnapshot = async (key: string, camera: string, at: number): Promise<Blob> =>
  (await request(key, `/snapshot?camera=${encodeURIComponent(camera)}&at=${Math.floor(at)}`)).blob()
/** Un service quelconque, pour l'explorateur de l'API : le statut et le corps tel quel. */
export const callService = async (key: string, path: string): Promise<{ status: number; body: string }> => {
  const res = await fetch(path, { headers: { [KEY_HEADER]: key } })
  return { status: res.status, body: await res.text() }
}

export const loadStoredKey = (): string => {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export const storeKey = (key: string) => {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key)
    else sessionStorage.removeItem(KEY_STORAGE)
  } catch {
    // Stockage indisponible (navigation privée) : la clé ne survit pas au rechargement, rien de plus.
  }
}
