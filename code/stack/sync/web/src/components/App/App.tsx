import { useCallback, useEffect, useRef, useState } from 'react'
import { EMPTY_HISTORY, addSystemSample, type LiveHistory } from '@/lib/live'
import { fetchOverview, fetchDocker, fetchHue, fetchNetwork, fetchPower, fetchSpecs, fetchSystem, isLoginRequired, login, logout } from '@/lib/api'
import type { Media, Docker, HueBridge, NetworkInterface, Overview, Power, Specs, System } from '@/types'
import AppUI from './UI'
import { DEFAULT_TAB, DESKTOP_QUERY, LIVE_CAPACITY, LIVE_MS, REFRESH_MS } from './constants'
import type { Status, TabId } from './types'

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/**
 * La page de House Sync : la clé (une session par cookie), puis deux onglets, la base (tables paginées) et le
 * disque (les clips). Tout se recharge toutes les 15 s, sauf quand un média est ouvert dans le panneau.
 */
const App = () => {
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [power, setPower] = useState<Power | null>(null)
  const [system, setSystem] = useState<System | null>(null)
  const [specs, setSpecs] = useState<Specs | null>(null)
  const [docker, setDocker] = useState<Docker | null>(null)
  const [network, setNetwork] = useState<NetworkInterface[] | null>(null)
  const [bridge, setBridge] = useState<HueBridge | null>(null)
  const [history, setHistory] = useState<LiveHistory>(EMPTY_HISTORY)
  // Écran de bureau ou mobile, lu une fois au départ : sur mobile les caractéristiques commencent fermées.
  const [specsOpen] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)
  const [loadedAt, setLoadedAt] = useState('')
  const [media, setMedia] = useState<Media | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB)

  // Compte les déconnexions : un chargement parti avant « Quitter » ne doit pas rouvrir la page quand il finit.
  const generation = useRef(0)

  // Charge la vue d'ensemble ; une session absente ou expirée ramène au formulaire.
  const refresh = useCallback(async () => {
    const started = generation.current
    try {
      const next = await fetchOverview()
      // Le reste est secondaire (si une mesure ne se lit pas, la page marche quand même) et se charge en parallèle.
      const [nextPower, nextSystem, nextSpecs, nextDocker, nextNetwork, nextBridge] = await Promise.all([
        fetchPower().catch(() => null),
        fetchSystem().catch(() => null),
        fetchSpecs().catch(() => null),
        fetchDocker().catch(() => null),
        fetchNetwork().catch(() => null),
        fetchHue().catch(() => null),
      ])
      if (generation.current !== started) return
      setOverview(next)
      setPower(nextPower)
      setSystem(nextSystem)
      setSpecs(nextSpecs)
      setDocker(nextDocker)
      setNetwork(nextNetwork)
      setBridge(nextBridge)
      setLoadedAt(new Date().toLocaleTimeString('fr-FR'))
      setRefreshTick((tick) => tick + 1)
      setStatus('ready')
      setMessage('')
    } catch (error) {
      if (generation.current !== started) return
      if (isLoginRequired(error)) {
        setStatus('locked')
        setOverview(null)
      } else {
        setMessage(errorMessage(error))
        // Jamais bloqué sur « Vérification… » : sans page déjà affichée, le formulaire revient (avec le message) pour réessayer.
        setStatus((current) => (current === 'ready' ? current : 'locked'))
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

  // Onglet Machine ouvert : le processeur et la mémoire sont relus toutes les 2 s pour la courbe en direct.
  useEffect(() => {
    if (status !== 'ready' || tab !== 'system') return
    let stopped = false
    const timer = setInterval(async () => {
      try {
        const next = await fetchSystem()
        if (stopped) return
        setSystem(next)
        setHistory((current) => addSystemSample(current, next, LIVE_CAPACITY))
      } catch {
        // une mesure perdue : la courbe attend la suivante
      }
    }, LIVE_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [status, tab])

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
    generation.current += 1
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
      power={power}
      system={system}
      specs={specs}
      history={history}
      specsOpen={specsOpen}
      docker={docker}
      network={network}
      bridge={bridge}
      loadedAt={loadedAt}
      media={media}
      refreshTick={refreshTick}
      tab={tab}
      onTab={setTab}
      onConnect={connect}
      onLogout={quit}
      onRefresh={refresh}
      onOpen={setMedia}
      onClose={() => setMedia(null)}
    />
  )
}

export default App
