// Les notifications de mouvement : tant que la WebApp est ouverte (même dans un onglet caché), chaque nouvel événement des caméras fait
// apparaître une notification du système (Windows, Android…). Rien pour les événements d'avant l'activation. L'accord du navigateur est demandé une fois.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EventRow } from '@/types'
import { formatTime } from './format'

const STORAGE_KEY = 'house-notify'
/** Un événement qui a commencé il y a plus longtemps n'est plus une nouvelle (la page vient de se rouvrir, la liste vient de se charger). */
const FRESH_SECONDS = 120

export type NotifyState = 'unsupported' | 'denied' | 'off' | 'on'

const supported = (): boolean => typeof Notification !== 'undefined'

const readEnabled = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

const writeEnabled = (value: boolean): void => {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // pas de stockage : le choix ne survit pas au rechargement
  }
}

/**
 * Affiche une notification : par le service worker (/sw.js) quand il est là (seul moyen sur Android), sinon par `new Notification` (bureau).
 * Un clic ramène sur la WebApp.
 */
const show = async (title: string, body: string, tag: string): Promise<void> => {
  try {
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (registration) return await registration.showNotification(title, { body, tag })
  } catch {
    // le service worker refuse : on essaie la notification directe
  }
  try {
    const notification = new Notification(title, { body, tag })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch {
    // ni l'un ni l'autre : pas de notification sur cet appareil
  }
}

/** Notifie chaque nouvel événement ; rend l'état du bouton et ce qu'il fait au clic. */
export const useMotionNotifications = (events: EventRow[], ready: boolean): { state: NotifyState; toggle: () => void } => {
  const [enabled, setEnabled] = useState(readEnabled)
  const [permission, setPermission] = useState<NotificationPermission>(() => (supported() ? Notification.permission : 'denied'))
  // Les événements déjà vus : à l'activation on retient ceux de la liste sans les notifier.
  const known = useRef<Set<string> | null>(null)

  const active = supported() && enabled && permission === 'granted'

  useEffect(() => {
    if (!ready || !active) {
      known.current = null
      return
    }
    if (known.current === null) {
      known.current = new Set(events.map((event) => event.id))
      return
    }
    const seen = known.current
    const now = Date.now() / 1000
    for (const event of events) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      if (now - event.started_at > FRESH_SECONDS) continue
      void show(`Mouvement · ${event.camera}`, formatTime(event.started_at), event.id)
    }
  }, [events, ready, active])

  const toggle = useCallback(() => {
    if (!supported()) return
    if (active) {
      writeEnabled(false)
      setEnabled(false)
      return
    }
    void Notification.requestPermission().then(async (result) => {
      if (result === 'granted' && 'serviceWorker' in navigator) await navigator.serviceWorker.register('/sw.js').catch(() => undefined)
      setPermission(result)
      writeEnabled(result === 'granted')
      setEnabled(result === 'granted')
    })
  }, [active])

  const state: NotifyState = !supported() ? 'unsupported' : permission === 'denied' ? 'denied' : active ? 'on' : 'off'
  return { state, toggle }
}
