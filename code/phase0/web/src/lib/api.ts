// Le client de House API : chaque appel porte la clé dans l'en-tête X-House-Key.
// La clé n'est jamais dans le code : elle vient de l'utilisateur, gardée dans l'onglet (sessionStorage).
import type { CameraRow, EventRow } from '@/types'

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
export const fetchImages = async (key: string): Promise<CameraRow[]> => (await request(key, '/image')).json()
export const fetchEvents = async (key: string): Promise<EventRow[]> => (await request(key, '/events')).json()
export const fetchClip = async (key: string, path: string): Promise<Blob> => (await request(key, path)).blob()
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
