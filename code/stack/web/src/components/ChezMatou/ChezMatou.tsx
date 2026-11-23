import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchLanState, fetchLanToken, LanError, lanStreamUrl, readLanKey, sendLanAc, sendLanLight, sendLanShutter } from '@/lib/lanApi'
import { readTvMode } from '@/lib/tvMode'
import { useMobile } from '@/lib/useMobile'
import { POLL_MS, RETRY_MS } from './constants'
import { lanAcUnits, lanRooms, lanShutters } from './helpers'
import ChezMatouUI from './UI'
import type { LanProblem, LanState } from './types'

/** La page « Chez Matou » (`/chezmatou?k=<LAN_KEY>`, ouverte depuis le Wi-Fi de la maison) : les deux caméras des perruches (agrandissables, 4K en grand), les volets, les lampes par zone et les climatisations, chacun seulement si House Sync l'autorise (`GET /lan/state`, relu toutes les 5 s). Le rendu est celui de la WebApp (`@house/ui`, `ShutterCard`, `AcUnitCard`). La clé vient de l'adresse puis de l'onglet (`lib/lanApi.ts`). */
const ChezMatou = () => {
  // Le mode télé est lu avant la clé : la clé efface l'adresse (et son `?tv=1`).
  const [tv] = useState<boolean>(readTvMode)
  const [key] = useState<string | null>(readLanKey)
  const [state, setState] = useState<LanState | null>(null)
  const [problem, setProblem] = useState<LanProblem | null>(key ? null : 'locked')
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)
  const [opened, setOpened] = useState<string | null>(null)
  const mobile = useMobile()

  // En mode télé, la page porte la classe `tv` (agrandie, cadre de sélection visible : `index.css`).
  useEffect(() => {
    document.documentElement.classList.toggle('tv', tv)
    return () => document.documentElement.classList.remove('tv')
  }, [tv])

  const load = useCallback(() => {
    if (!key) return Promise.resolve()
    return fetchLanState(key).then(
      (result) => {
        setState(result)
        setProblem(null)
      },
      (error: unknown) => {
        setState(null)
        setProblem(error instanceof LanError ? error.problem : 'unreachable')
      },
    )
  }, [key])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  // Le jeton des images : demandé quand les caméras sont permises, redemandé quand un flux s'arrête (`tick`).
  const cameras = state?.cameras != null
  useEffect(() => {
    if (!key || !cameras) return
    let cancelled = false
    fetchLanToken(key).then(
      (value) => {
        if (!cancelled) setToken(value)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [key, cameras, tick])

  const run = (part: string, action: () => Promise<unknown>) => {
    setBusy(part)
    setFailed(false)
    action()
      .then(() => load())
      .catch(() => setFailed(true))
      .finally(() => setBusy(null))
  }

  const rooms = useMemo(() => lanRooms(state?.lights ?? []), [state?.lights])
  const onStreamError = () => {
    setToken(null)
    setTimeout(() => setTick((value) => value + 1), RETRY_MS)
  }
  const closeCamera = useCallback(() => setOpened(null), [])
  return (
    <ChezMatouUI
      tv={tv}
      state={state}
      problem={problem}
      rooms={rooms}
      shutters={lanShutters(state?.shutters ?? [])}
      acUnits={lanAcUnits(state?.ac ?? [])}
      streamUrl={(camera, hd = false) => (token ? lanStreamUrl(camera, token, hd, mobile) : null)}
      onStreamError={onStreamError}
      opened={opened}
      onOpenCamera={setOpened}
      onCloseCamera={closeCamera}
      busy={busy}
      error={failed ? 'failed' : null}
      onShutter={(id, command) => key && run(`shutter:${id}`, () => sendLanShutter(key, id, command))}
      onRoom={(roomId, on) => key && run(`room:${roomId}`, () => Promise.all((rooms.find((room) => room.id === roomId)?.lights ?? []).map((light) => sendLanLight(key, light.id, on))))}
      onLight={(id, on) => key && run(`light:${id}`, () => sendLanLight(key, id, on))}
      onAc={(id, patch) => key && run(`ac:${id}`, () => sendLanAc(key, id, patch))}
    />
  )
}

export default ChezMatou
