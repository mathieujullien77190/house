// Le client de House API : chaque appel porte la clé dans l'en-tête X-House-Key.
// La clé n'est jamais dans le code : elle vient de l'utilisateur, la saisie ouvre une session par cookie (voir /auth).
import type { ZonePoint } from '@house/ui'
import type { CameraPower, CameraRow, EventRow, GuestInfo, HeatingSettingsBody, HeatingStatus, HueAutomation, HueRoom, HueSensor, HueState, PlugState, ShutterAuto, ShutterCommand, ShutterInfo, ShuttersState } from '@/types'

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
/** Pose la note d'un clip (vide : la supprime) ; rend la note telle que l'API l'a gardée (sans espaces autour, tronquée). */
export const setClipNote = async (key: string, id: string, note: string): Promise<string> => {
  const res = await fetch(`/clips/${encodeURIComponent(id)}/note`, {
    method: 'PUT',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/clips : HTTP ${res.status}`)
  return ((await res.json()) as { note: string }).note
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
export const setPlug = async (key: string, on: boolean, minutes?: number, offOnMotion = false): Promise<PlugState> => {
  const res = await fetch('/plug', {
    method: 'POST',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ on, ...(minutes === undefined ? {} : { minutes }), ...(offOnMotion ? { offOnMotion } : {}) }),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/plug : HTTP ${res.status}`)
  return res.json()
}

/** Les volets roulants et leur dernier ordre (503 si aucun volet n'est configuré). */
export const fetchShutters = async (key: string): Promise<ShuttersState> => (await request(key, '/shutters')).json()

/** Envoie un ordre (monter, descendre, stop) à un volet ; 502 si l'ESP32 ne répond pas. */
export const sendShutter = async (key: string, id: string, command: ShutterCommand): Promise<ShutterInfo> => {
  const res = await fetch(`/shutters/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/shutters : HTTP ${res.status}`)
  return res.json()
}

/** « Fermer à moitié » : le volet monte à fond puis redescend de moitié (l'API fait l'attente) ; rend le volet, en cours. */
export const closeShutterHalf = async (key: string, id: string): Promise<ShutterInfo> => {
  const res = await fetch(`/shutters/${encodeURIComponent(id)}/half`, { method: 'POST', headers: { [KEY_HEADER]: key } })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/shutters : HTTP ${res.status}`)
  return res.json()
}

/** Change une option de l'action automatique d'un volet (`open` : ouvrir au lever du soleil, `close` : fermer à son coucher) ; 404 si le volet n'en a pas. */
export const setShutterAuto = async (key: string, id: string, patch: Partial<ShutterAuto>): Promise<void> => {
  const res = await fetch(`/shutters/${encodeURIComponent(id)}/auto`, {
    method: 'PUT',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/shutters : HTTP ${res.status}`)
}

/** Les réglages du chauffage automatique et l'état de la règle (503 sans prise ou sans pont Hue). */
export const fetchHeating = async (key: string): Promise<HeatingStatus> => (await request(key, '/plug/heating')).json()

/** Les dernières activations du chauffage, la plus récente d'abord (503 sans prise). */

/** Change les réglages du chauffage automatique (une valeur absente garde l'ancienne) ; en cas de refus (400), l'erreur porte le texte de l'API. */
export const saveHeating = async (key: string, body: HeatingSettingsBody): Promise<HeatingStatus> => {
  const res = await fetch('/plug/heating', {
    method: 'PUT',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: unknown } | null
    throw new ApiError(res.status, typeof detail?.error === 'string' ? detail.error : `/plug/heating : HTTP ${res.status}`)
  }
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
export const fetchLampPositions = async (key: string): Promise<Record<string, { x: number; y: number }>> =>
  (await request(key, '/hue/positions')).json()

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

/** Les zones de surveillance du mouvement : un polygone par caméra qui en a une (parts de l'image, de 0 à 1) ; une caméra sans entrée est surveillée sur toute l'image. */
export const fetchZones = async (key: string): Promise<Record<string, ZonePoint[]>> => (await request(key, '/zones')).json()
/** Fixe la zone de surveillance d'une caméra (un polygone), ou la retire (null : toute l'image). */
export const putZone = async (key: string, camera: string, points: ZonePoint[] | null): Promise<void> => {
  const res = await fetch(`/zones/${encodeURIComponent(camera)}`, {
    method: 'PUT',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/zones : HTTP ${res.status}`)
}

/** Le plan de la maison tel que House API le garde (même document sur tous les appareils). */
export interface PlanDocument {
  /** 2 : positions en longitude (x) et latitude (y), tailles en mètres, angles en caps ; 1 ou absent : l'ancien plan, en unités du dessin. */
  version?: number
  trees: { id: string; x: number; y: number; r: number }[]
  hedges: { id: string; points: [number, number][] }[]
  cage: { x: number; y: number } | null
  offsets: Record<string, { dx: number; dy: number }>
  items: Record<string, { x: number; y: number }>
  cameras: { id: string; name: string; x: number; y: number; angle: number; fov: number; near: number; far: number }[]
  links: Record<string, string>
}
/** Le plan gardé, ou null s'il n'y en a pas encore. */
export const fetchPlan = async (key: string): Promise<PlanDocument | null> =>
  ((await (await request(key, '/plan')).json()) as { plan: PlanDocument | null }).plan
/** Remplace le plan gardé par celui de cet appareil. */
export const putPlan = async (key: string, plan: PlanDocument): Promise<void> => {
  const res = await fetch('/plan', {
    method: 'PUT',
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/plan : HTTP ${res.status}`)
}

/** L'extinction en douceur d'une lampe (la luminosité descend au minimum en 15 minutes, puis elle s'éteint) : en cours ou non, et quand elle finit (secondes depuis 1970). */
export interface FadeState {
  fading: boolean
  ends_at: number | null
}
export const fetchFade = async (key: string, lampId: string): Promise<FadeState> => (await request(key, `/hue/lights/${encodeURIComponent(lampId)}/fade`)).json()
const fadeCall = async (key: string, lampId: string, method: 'POST' | 'DELETE'): Promise<FadeState> => {
  const res = await fetch(`/hue/lights/${encodeURIComponent(lampId)}/fade`, {
    method,
    headers: { [KEY_HEADER]: key, 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify({ minutes: 15 }) : undefined,
  })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/hue/lights/${lampId}/fade : HTTP ${res.status}`)
  return res.json()
}
export const startFade = (key: string, lampId: string): Promise<FadeState> => fadeCall(key, lampId, 'POST')
export const cancelFade = (key: string, lampId: string): Promise<FadeState> => fadeCall(key, lampId, 'DELETE')

/** L'enregistrement d'un clip lancé à la main sur une caméra (il s'arrête seul au bout de 3 minutes ; le clip est sauvegardé d'office). */
export interface RecordingState {
  recording: boolean
  id: string | null
  started_at: number | null
}
export const fetchRecording = async (key: string, camera: string): Promise<RecordingState> =>
  (await request(key, `/record/${encodeURIComponent(camera)}`)).json()
const recordingCall = async (key: string, camera: string, method: 'POST' | 'DELETE'): Promise<void> => {
  const res = await fetch(`/record/${encodeURIComponent(camera)}`, { method, headers: { [KEY_HEADER]: key } })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `/record : HTTP ${res.status}`)
}
export const startRecording = (key: string, camera: string): Promise<void> => recordingCall(key, camera, 'POST')
export const stopRecording = (key: string, camera: string): Promise<void> => recordingCall(key, camera, 'DELETE')
