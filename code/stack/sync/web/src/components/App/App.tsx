import { useCallback, useEffect, useRef, useState } from 'react'
import { EMPTY_HISTORY, addSystemSample, type LiveHistory } from '@/lib/live'
import { fetchCameraEnergy, fetchLampEnergy, fetchMachineEnergy, fetchOverview, fetchDocker, fetchHue, fetchNetwork, fetchSpecs, fetchSystem, isLoginRequired, login, logout } from '@/lib/api'
import type { CameraEnergy, Media, Docker, HueBridge, LampEnergy, MachineEnergy, NetworkInterface, Overview, Specs, System } from '@/types'
import AppUI from './UI'
import { DEFAULT_TAB, DESKTOP_QUERY, LIVE_CAPACITY, LIVE_MS, REFRESH_MS } from './constants'
import type { Status, TabId } from './types'

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** Une lecture secondaire : si elle échoue la page marche quand même (null), sauf une session expirée, qui ramène au formulaire. */
const soft = <T,>(request: Promise<T>): Promise<T | null> =>
  request.catch((error: unknown) => {
    if (isLoginRequired(error)) throw error
    return null
  })

/**
 * La page de House Sync : la clé (une session par cookie), puis des onglets. **Seule la page affichée est chargée** : les autres se chargent par leurs
 * propres requêtes quand on les ouvre, et toutes les 15 s seule la page affichée est relue (sauf quand un média est ouvert dans le panneau).
 */
const App = () => {
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [cameraEnergy, setCameraEnergy] = useState<CameraEnergy | null>(null)
  const [lampEnergy, setLampEnergy] = useState<LampEnergy | null>(null)
  const [machineEnergy, setMachineEnergy] = useState<MachineEnergy | null>(null)
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
  // L'onglet affiché, lu par le rafraîchissement (qui ne change pas quand on change d'onglet).
  const tabRef = useRef<TabId>(DEFAULT_TAB)

  // Charge ce que la page demandée affiche, et rien d'autre ; une session absente ou expirée lève une erreur qui ramène au formulaire.
  const loadTab = useCallback(async (target: TabId, started: number) => {
    if (target === 'db' || target === 'disk') {
      // Les tables (ou le dossier des clips) : la vue d'ensemble sans le parcours du disque backup, qui n'est utile qu'à l'onglet Machine.
      const next = await fetchOverview(false)
      if (generation.current === started) setOverview(next)
    } else if (target === 'system') {
      // Le reste est secondaire (si une mesure ne se lit pas, la page marche quand même) et se charge en parallèle.
      const next = await fetchOverview(true)
      const [nextEnergy, nextLampEnergy, nextMachineEnergy, nextSystem, nextSpecs, nextNetwork, nextBridge] = await Promise.all([soft(fetchCameraEnergy()), soft(fetchLampEnergy()), soft(fetchMachineEnergy()), soft(fetchSystem()), soft(fetchSpecs()), soft(fetchNetwork()), soft(fetchHue())])
      if (generation.current !== started) return
      setOverview(next)
      setCameraEnergy(nextEnergy)
      setLampEnergy(nextLampEnergy)
      setMachineEnergy(nextMachineEnergy)
      setSystem(nextSystem)
      setSpecs(nextSpecs)
      setNetwork(nextNetwork)
      setBridge(nextBridge)
    } else if (target === 'docker') {
      const next = await soft(fetchDocker())
      if (generation.current === started) setDocker(next)
    } else {
      // Les réglages se lisent eux-mêmes ; on vérifie seulement que la session tient (une lecture légère).
      await fetchOverview(false)
    }
  }, [])

  // Charge la page affichée ; une session absente ou expirée ramène au formulaire.
  const refresh = useCallback(async () => {
    const started = generation.current
    try {
      await loadTab(tabRef.current, started)
      if (generation.current !== started) return
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
  }, [loadTab])

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

  // Un autre onglet : sa page se charge tout de suite par ses propres requêtes.
  const changeTab = (next: TabId) => {
    tabRef.current = next
    setTab(next)
    void refresh()
  }

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
    // On verrouille d'abord, avant d'attendre le serveur : sinon un rafraîchissement lancé pendant la déconnexion, et fini après elle, rouvrirait la page.
    generation.current += 1
    setOverview(null)
    setMedia(null)
    setStatus('locked')
    await logout()
  }

  return (
    <AppUI
      status={status}
      message={message}
      overview={overview}
      cameraEnergy={cameraEnergy}
      lampEnergy={lampEnergy}
      machineEnergy={machineEnergy}
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
      onTab={changeTab}
      onConnect={connect}
      onLogout={quit}
      onOpen={setMedia}
      onClose={() => setMedia(null)}
    />
  )
}

export default App
