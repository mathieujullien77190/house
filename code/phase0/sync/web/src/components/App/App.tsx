import { useCallback, useEffect, useState } from 'react'
import { fetchOverview, isLoginRequired, login, logout } from '@/lib/api'
import type { Media, Overview } from '@/types'
import AppUI from './UI'
import { REFRESH_MS } from './constants'
import type { Status } from './types'

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/**
 * La page de House Sync : la clé (une session par cookie), puis la vue d'ensemble, les tables paginées et les clips.
 * Tout se recharge toutes les 15 s, sauf quand un média est ouvert dans le panneau.
 */
const App = () => {
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loadedAt, setLoadedAt] = useState('')
  const [media, setMedia] = useState<Media | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  // Charge la vue d'ensemble ; une session absente ou expirée ramène au formulaire.
  const refresh = useCallback(async () => {
    try {
      setOverview(await fetchOverview())
      setLoadedAt(new Date().toLocaleTimeString('fr-FR'))
      setRefreshTick((tick) => tick + 1)
      setStatus('ready')
      setMessage('')
    } catch (error) {
      if (isLoginRequired(error)) {
        setStatus('locked')
        setOverview(null)
      } else {
        setMessage(errorMessage(error))
      }
    }
  }, [])

  // Au démarrage : la session du cookie est peut-être encore valable (appel différé, hors du rendu).
  useEffect(() => {
    const timer = setTimeout(refresh, 0)
    return () => clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    if (status !== 'ready' || media) return
    const timer = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(timer)
  }, [status, media, refresh])

  const connect = async (key: string) => {
    setStatus('checking')
    setMessage('')
    try {
      await login(key)
      await refresh()
    } catch (error) {
      setMessage(errorMessage(error))
      setStatus('locked')
    }
  }

  const quit = async () => {
    await logout()
    setOverview(null)
    setMedia(null)
    setStatus('locked')
  }

  return (
    <AppUI
      status={status}
      message={message}
      overview={overview}
      loadedAt={loadedAt}
      media={media}
      refreshTick={refreshTick}
      onConnect={connect}
      onLogout={quit}
      onRefresh={refresh}
      onOpen={setMedia}
      onClose={() => setMedia(null)}
    />
  )
}

export default App
