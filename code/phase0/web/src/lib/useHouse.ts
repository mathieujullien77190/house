// L'état de la WebApp : la clé, sa vérification, puis les caméras et les événements, rafraîchis à intervalle régulier.
import { useCallback, useEffect, useState } from 'react'
import { checkKey, fetchEvents, fetchImages, fetchLive, isKeyRefused, loadStoredKey, storeKey } from './api'
import type { Camera, EventRow } from '@/types'

export const EVENTS_REFRESH_MS = 1_000

export type Status = 'locked' | 'checking' | 'ready'

export interface HouseState {
  status: Status
  /** Message d'erreur ou d'information, vide quand tout va bien. */
  message: string
  cameras: Camera[]
  events: EventRow[]
  key: string
  connect: (key: string) => void
  forget: () => void
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const mergeCameras = (live: { camera: string; url: string }[], images: { camera: string; url: string }[]): Camera[] =>
  live.map(({ camera, url }) => ({
    name: camera,
    liveUrl: url,
    imageUrl: images.find((row) => row.camera === camera)?.url ?? null,
  }))

export const useHouse = (): HouseState => {
  const [key, setKey] = useState(loadStoredKey)
  const [status, setStatus] = useState<Status>(() => (loadStoredKey() ? 'checking' : 'locked'))
  const [message, setMessage] = useState('')
  const [cameras, setCameras] = useState<Camera[]>([])
  const [events, setEvents] = useState<EventRow[]>([])

  const forget = useCallback(() => {
    storeKey('')
    setKey('')
    setCameras([])
    setEvents([])
    setStatus('locked')
    setMessage('')
  }, [])

  const connect = useCallback((next: string) => {
    setKey(next)
    setStatus('checking')
    setMessage('')
  }, [])

  // Vérifie la clé puis charge les caméras ; une clé refusée est oubliée.
  useEffect(() => {
    if (status !== 'checking') return
    let cancelled = false
    const run = async () => {
      try {
        await checkKey(key)
        const [live, images, rows] = await Promise.all([fetchLive(key), fetchImages(key), fetchEvents(key)])
        if (cancelled) return
        storeKey(key)
        setCameras(mergeCameras(live, images))
        setEvents(rows)
        setStatus('ready')
      } catch (error) {
        if (cancelled) return
        setMessage(errorMessage(error))
        if (isKeyRefused(error)) {
          storeKey('')
          setKey('')
        }
        setStatus('locked')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [status, key])

  // Les événements, à intervalle régulier tant que la page est connectée.
  useEffect(() => {
    if (status !== 'ready') return
    const refresh = async () => {
      try {
        setEvents(await fetchEvents(key))
        setMessage('')
      } catch (error) {
        setMessage(errorMessage(error))
        if (isKeyRefused(error)) forget()
      }
    }
    const timer = setInterval(refresh, EVENTS_REFRESH_MS)
    return () => clearInterval(timer)
  }, [status, key, forget])

  return { status, message, cameras, events, key, connect, forget }
}
