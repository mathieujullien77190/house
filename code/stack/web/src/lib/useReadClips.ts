// Les clips déjà ouverts sur cet appareil : gardés dans le navigateur (localStorage), les plus anciens oubliés au-delà de MAX_KEPT.
import { useCallback, useState } from 'react'

const STORAGE_KEY = 'house-read-clips'
const MAX_KEPT = 500

const load = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

const save = (ids: string[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // pas de stockage : le « lu » ne survit pas au rechargement
  }
}

export interface ReadClips {
  isRead: (id: string) => boolean
  markRead: (id: string) => void
}

export const useReadClips = (): ReadClips => {
  const [ids, setIds] = useState<string[]>(load)
  const markRead = useCallback((id: string) => {
    setIds((current) => {
      if (current.includes(id)) return current
      const next = [...current, id].slice(-MAX_KEPT)
      save(next)
      return next
    })
  }, [])
  const isRead = useCallback((id: string) => ids.includes(id), [ids])
  return { isRead, markRead }
}
