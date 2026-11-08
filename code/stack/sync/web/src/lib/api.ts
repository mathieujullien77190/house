// Le client de House Sync : la session est un cookie posé par /login, envoyé tout seul par le navigateur.
import type { CameraSetting } from '@/components/SettingsSection'
import { NO_FILTER, filterQuery } from '@/lib/filter'
import type { CameraEnergy, ClipGroup, Docker, Filter, FilteredPage, HueBridge, NetworkInterface, Overview, Page, Power, Row, Specs, System } from '@/types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const isLoginRequired = (error: unknown): boolean => error instanceof ApiError && error.status === 401

const request = async (path: string, init?: RequestInit): Promise<Response> => {
  const res = await fetch(path, init)
  if (res.status === 401) throw new ApiError(401, 'connexion requise')
  if (!res.ok) throw new ApiError(res.status, `${path} : HTTP ${res.status}`)
  return res
}

export const login = async (key: string): Promise<void> => {
  const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) })
  if (res.status === 401) throw new ApiError(401, 'clé refusée')
  if (!res.ok) throw new ApiError(res.status, `connexion : HTTP ${res.status}`)
}

export const logout = async (): Promise<void> => {
  await fetch('/logout', { method: 'POST' })
}

export const fetchSettings = async (): Promise<CameraSetting[]> => (await request('/api/settings')).json()

/** Enregistre un réglage d'une caméra (clips gardés, rythme des images) ; rend les réglages à jour. */
export const saveSetting = async (camera: string, patch: Partial<Omit<CameraSetting, 'camera'>>): Promise<CameraSetting> =>
  (await request('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ camera, ...patch }) })).json()

/** La durée de garde des clips non sauvegardés, en jours (la même pour toutes les caméras). */
export const fetchRetention = async (): Promise<number> => ((await (await request('/api/retention')).json()) as { clip_retention_days: number }).clip_retention_days

export const saveRetention = async (days: number): Promise<number> =>
  (
    (await (
      await request('/api/retention', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clip_retention_days: days }) })
    ).json()) as { clip_retention_days: number }
  ).clip_retention_days

/** La page invité : ses images par seconde (vignettes et 4K, PC et téléphone, toutes les caméras) et si elle est en ligne ou coupée (port fermé). */
export interface GuestSettings {
  guest_fps: number
  guest_enabled: boolean
}

export const fetchGuest = async (): Promise<GuestSettings> => (await request('/api/guest')).json()

export const saveGuest = async (patch: Partial<GuestSettings>): Promise<GuestSettings> =>
  (await request('/api/guest', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })).json()

/** La vue d'ensemble : sans `full`, seulement la base (rapide, sans parcourir le disque backup) ; avec, aussi le disque (clips, images, place). */
export const fetchOverview = async (full = true): Promise<Overview> => (await request(full ? '/api/overview' : '/api/overview?part=database')).json()

export const fetchDocker = async (): Promise<Docker> => (await request('/api/docker')).json()

export const fetchSpecs = async (): Promise<Specs> => (await request('/api/specs')).json()

export const fetchHue = async (): Promise<HueBridge> => (await request('/api/hue')).json()

export const fetchNetwork = async (): Promise<NetworkInterface[]> => (await request('/api/network')).json()

export const fetchSystem = async (): Promise<System> => (await request('/api/system')).json()

export const fetchPower = async (): Promise<Power> => (await request('/api/power')).json()

export const fetchCameraEnergy = async (): Promise<CameraEnergy> => (await request('/api/camera-energy')).json()

export const fetchTable = async (name: string, page: number, size: number, filter: Filter = NO_FILTER): Promise<FilteredPage<Row>> =>
  (await request(`/api/table?name=${encodeURIComponent(name)}&page=${page}&size=${size}${filterQuery(filter)}`)).json()

/** Les clips du disque (`saved` : les sauvegardés ou les autres), avec les caméras qui en ont. */
export const fetchClips = async (page: number, size: number, saved: boolean, filter: Filter = NO_FILTER): Promise<FilteredPage<ClipGroup>> => {
  const result = (await request(`/api/clips?page=${page}&size=${size}&saved=${saved ? 1 : 0}${filterQuery(filter, 'camera')}`)).json() as Promise<Page<ClipGroup> & { cameras: string[] }>
  const { cameras, ...rest } = await result
  return { ...rest, options: cameras }
}

/** L'adresse d'un fichier du disque backup, servie par House Sync derrière la session. */
export const fileUrl = (path: string): string => `/files/${path}`
