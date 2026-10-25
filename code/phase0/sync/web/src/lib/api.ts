// Le client de House Sync : la session est un cookie posé par /login, envoyé tout seul par le navigateur.
import type { BackupFile, Overview, Page, Row } from '@/types'

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

export const fetchOverview = async (): Promise<Overview> => (await request('/api/overview')).json()

export const fetchTable = async (name: string, page: number, size: number): Promise<Page<Row>> =>
  (await request(`/api/table?name=${encodeURIComponent(name)}&page=${page}&size=${size}`)).json()

export const fetchClips = async (page: number, size: number): Promise<Page<BackupFile>> =>
  (await request(`/api/clips?page=${page}&size=${size}`)).json()

/** L'adresse d'un fichier du disque backup, servie par House Sync derrière la session. */
export const fileUrl = (path: string): string => `/files/${path}`
