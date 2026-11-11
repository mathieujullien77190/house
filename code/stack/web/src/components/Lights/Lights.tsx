import { useCallback, useEffect, useState } from 'react'
import { Collapsible, LightsPanel, Notice, SpecList } from '@house/ui'
import { CAMERA_LAMP } from '@/components/CameraCard/constants'
import FadeButton from '@/components/FadeButton'
import { useFade } from '@/lib/useFade'
import { useMobile } from '@/lib/useMobile'
import { ApiError, fetchAutomations, fetchLights, fetchSensors, setHue } from '@/lib/api'
import type { HueAutomation, HueRoom, HueSensor, HueState } from '@/types'
import {
  ALL_KEY,
  AUTOMATIONS_POLL_MS,
  AUTOMATIONS_TITLE,
  EMPTY_TEXT,
  EXCLUDED_FROM_ALL,
  ERROR_TEXT,
  LOADING_TEXT,
  MAX_BRI,
  NOT_CONFIGURED_TEXT,
  POLL_MS,
} from './constants'
import { allLights, buildAutomationItems, buildZones } from './helpers'
import type { LightsProps, LightsStatus } from './types'

/**
 * Les lumières du pont Hue : les zones de la maison et leurs lampes, relues toutes les 5 s. Allumer, éteindre ou régler la luminosité d'une zone entière (lampe par lampe) ou d'une
 * lampe ; le curseur envoie sa valeur au relâchement (le pont n'aime pas qu'on le noie). La carte des lampes est dans l'accueil (`HouseMap`).
 */
const Lights = ({ apiKey }: LightsProps) => {
  const [rooms, setRooms] = useState<HueRoom[]>([])
  const [sensors, setSensors] = useState<HueSensor[]>([])
  const [automations, setAutomations] = useState<HueAutomation[]>([])
  const [status, setStatus] = useState<LightsStatus>('loading')
  const mobile = useMobile()
  const [busy, setBusy] = useState('')
  const [drafts, setDrafts] = useState<Record<string, number>>({})
  // L'extinction en douceur de la lampe de la perruche : tenue ici pour que son curseur suive la descente.
  const perruche = CAMERA_LAMP['voliere-interieur']
  const fade = useFade(apiKey, perruche, true)

  const fail = useCallback((error: unknown) => setStatus(error instanceof ApiError && error.status === 503 ? 'unavailable' : 'error'), [])

  useEffect(() => {
    let cancelled = false
    const load = () =>
      Promise.all([fetchLights(apiKey), fetchSensors(apiKey).catch(() => [])])
        .then(([list, found]) => {
          if (cancelled) return
          setRooms(list)
          setSensors(found)
          setStatus('ready')
        })
        .catch((error: unknown) => {
          if (!cancelled) fail(error)
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey, fail])

  // Les règles d'automatisation du pont : lues rarement, et sans bloquer le reste si le pont ne les donne pas.
  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchAutomations(apiKey)
        .then((list) => {
          if (!cancelled) setAutomations(list)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, AUTOMATIONS_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey])

  const run = async (key: string, task: () => Promise<HueRoom[] | null>) => {
    setBusy(key)
    try {
      const list = await task()
      if (list) setRooms(list)
      setStatus('ready')
    } catch (error) {
      fail(error)
    } finally {
      setBusy('')
      setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([draftKey]) => draftKey !== key)))
    }
  }

  const lights = allLights(rooms)
  const zones = buildZones(lights, sensors)

  const changeLight = (id: string, state: HueState) => run(`light:${id}`, () => setHue(apiKey, 'lights', id, state))

  // Commande des lampes une par une (le pont ne connaît pas nos zones) : seules celles qui répondent sont touchées. Une lampe qui échoue
  // ne bloque pas les suivantes, et l'écran montre toujours ce qui a changé ; l'erreur est rendue à la fin.
  const eachLight = async (targets: { id: string; reachable: boolean }[], state: HueState): Promise<HueRoom[] | null> => {
    let list: HueRoom[] | null = null
    let failure: unknown = null
    for (const light of targets) {
      if (!light.reachable) continue
      try {
        list = await setHue(apiKey, 'lights', light.id, state)
      } catch (error) {
        failure = error
      }
    }
    if (list) setRooms(list)
    if (failure) throw failure
    return list
  }

  // Une zone se commande lampe par lampe.
  const changeZone = (id: string, state: HueState) =>
    run(`room:${id}`, () => eachLight(zones.find((zone) => zone.id === id)?.lights ?? [], state))

  // Tout allumer ou tout éteindre : les lampes des zones (pas les lampes à placer, pas la volière) qui répondent, une par une.
  const changeAll = (on: boolean) =>
    run(ALL_KEY, () =>
      eachLight(
        zones.filter((item) => !EXCLUDED_FROM_ALL.includes(item.id)).flatMap((zone) => zone.lights),
        on ? { on, bri: MAX_BRI } : { on },
      ),
    )

  // Pendant l'extinction en douceur, le curseur de la lampe de la perruche descend de sa luminosité d'avant au minimum en 15 minutes (le pont annonce tout de suite la cible, pas le trajet).
  const shownDrafts = fade.level === null ? drafts : { ...drafts, [`light:${perruche}`]: fade.level }

  const notice = (text: string) => <Notice text={text} />
  if (rooms.length === 0) {
    if (status === 'unavailable') return notice(NOT_CONFIGURED_TEXT)
    if (status === 'error') return notice(ERROR_TEXT)
    if (status === 'loading') return notice(LOADING_TEXT)
    return notice(EMPTY_TEXT)
  }
  return (
    <>
      {status === 'error' ? <Notice text={ERROR_TEXT} /> : null}
      <LightsPanel
        rooms={zones}
        busy={busy}
        drafts={shownDrafts}
        // La lampe de la perruche a en plus son bouton d'extinction en douceur (15 min), comme dans le détail de sa caméra.
        lampExtra={(light) => (light.id === CAMERA_LAMP['voliere-interieur'] ? <FadeButton fade={fade} on={light.on} /> : null)}
        onAll={(on) => void changeAll(on)}
        onRoom={(id, state) => void changeZone(id, state)}
        onLight={(id, state) => void changeLight(id, state)}
        onDraft={(key, percent) => setDrafts((current) => ({ ...current, [key]: percent }))}
      />
      {automations.length > 0 ? (
        <Collapsible
          title={AUTOMATIONS_TITLE}
          detail={`${automations.filter((automation) => automation.enabled).length}/${automations.length} actives`}
          defaultOpen={!mobile}
        >
          <SpecList items={buildAutomationItems(automations)} />
        </Collapsible>
      ) : null}
    </>
  )
}

export default Lights
