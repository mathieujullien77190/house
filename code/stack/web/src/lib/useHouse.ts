// L'état de la WebApp : la clé, sa vérification, puis les caméras et les événements, rafraîchis à intervalle régulier.
import { useCallback, useEffect, useState } from 'react'
import { checkKey, clearStoredKey, fetchEvents, fetchLive, isKeyRefused } from './api'
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

const toCameras = (live: { camera: string; orientation?: Camera['orientation'] }[]): Camera[] =>
  live.map(({ camera, orientation }) => ({ name: camera, orientation: orientation === 'portrait' ? 'portrait' : 'landscape' }))

export const useHouse = (): HouseState => {
  // Au départ pas de clé : on essaie la session par cookie ; sinon la page demande la clé.
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState('')
  const [cameras, setCameras] = useState<Camera[]>([])
  const [events, setEvents] = useState<EventRow[]>([])

  const forget = useCallback(() => {
    // Ferme aussi la session (cookie) qui autorise le direct.
    fetch('/logout').catch(() => undefined)
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

  // Efface la clé que les anciennes versions gardaient dans l'onglet : la session est maintenant un cookie.
  useEffect(() => clearStoredKey(), [])

  // Vérifie la clé puis charge les caméras ; une clé refusée est oubliée.
  useEffect(() => {
    if (status !== 'checking') return
    let cancelled = false
    const run = async () => {
      try {
        await checkKey(key)
        const [live, rows] = await Promise.all([fetchLive(key), fetchEvents(key)])
        if (cancelled) return
        setCameras(toCameras(live))
        setEvents(rows)
        setStatus('ready')
      } catch (error) {
        if (cancelled) return
        // Sans clé saisie, un refus veut seulement dire qu'il n'y a pas (ou plus) de session : pas de message.
        setMessage(key || !isKeyRefused(error) ? errorMessage(error) : '')
        if (isKeyRefused(error)) setKey('')
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
    // Un seul appel à la fois (un lien lent n'empile pas les requêtes), et plus rien après le départ de l'écran.
    let busy = false
    let cancelled = false
    const refresh = async () => {
      if (busy) return
      busy = true
      try {
        const rows = await fetchEvents(key)
        if (cancelled) return
        setEvents(rows)
        setMessage('')
      } catch (error) {
        if (cancelled) return
        // `forget` efface le message : on l'écrit après, pour que « clé refusée » reste visible.
        if (isKeyRefused(error)) forget()
        setMessage(errorMessage(error))
      } finally {
        busy = false
      }
    }
    const timer = setInterval(refresh, EVENTS_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [status, key, forget])

  return { status, message, cameras, events, key, connect, forget }
}
