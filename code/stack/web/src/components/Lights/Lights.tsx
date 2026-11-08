import { useCallback, useEffect, useState } from 'react'
import { Collapsible, LightsPanel, Notice, SpecList } from '@house/ui'
import { CAMERA_LAMP } from '@/components/CameraCard/constants'
import FadeButton from '@/components/FadeButton'
import MapPlan from '@/components/MapPlan'
import { PARCEL_GATES } from '@/components/MapPlan/parcel'
import { useLegacyPositions } from '@/lib/useLegacyPositions'
import { useMobile } from '@/lib/useMobile'
import { usePlan } from '@/lib/usePlan'
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
  NOT_CONFIGURED_TEXT,
  PLAN_SECTION_TITLE,
  POLL_MS,
} from './constants'
import { allLights, buildAutomationItems, buildZones, planLamps } from './helpers'
import type { LightsProps, LightsStatus } from './types'

/**
 * Les lumières du pont Hue : la carte de la maison (la même que celle des caméras, toit caché) avec une ampoule par lampe (qu'on touche pour
 * l'allumer, qu'on glisse en mode « Modifier » pour la placer), puis les zones de la maison et leurs lampes, relues toutes les 5 s. Allumer, éteindre ou régler la luminosité d'une
 * zone entière (lampe par lampe) ou d'une lampe ; le curseur envoie sa valeur au relâchement (le pont n'aime pas qu'on le noie).
 * Les positions des ampoules sont gardées dans le plan de l'API (longitude et latitude) : elles restent où on les a mises, sur tous les appareils.
 */
const Lights = ({ apiKey }: LightsProps) => {
  const [rooms, setRooms] = useState<HueRoom[]>([])
  const [sensors, setSensors] = useState<HueSensor[]>([])
  const [automations, setAutomations] = useState<HueAutomation[]>([])
  const [status, setStatus] = useState<LightsStatus>('loading')
  const mobile = useMobile()
  // Le plan de la maison (la carte) : arbres, haies, cage… et la place des lampes, gardés par l'API.
  const plan = usePlan(apiKey)
  const legacy = useLegacyPositions(apiKey)
  const [busy, setBusy] = useState('')
  const [drafts, setDrafts] = useState<Record<string, number>>({})

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
  const lamps = planLamps(lights, plan.items, legacy)

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
        zones.filter((item) => !item.ungrouped && !EXCLUDED_FROM_ALL.includes(item.id)).flatMap((zone) => zone.lights),
        { on },
      ),
    )

  const toggle = (id: string) => {
    const light = lights.find((item) => item.id === id)
    if (light?.reachable) void changeLight(id, { on: !light.on })
  }

  const notice = (text: string) => <Notice text={text} />
  if (rooms.length === 0) {
    if (status === 'unavailable') return notice(NOT_CONFIGURED_TEXT)
    if (status === 'error') return notice(ERROR_TEXT)
    if (status === 'loading') return notice(LOADING_TEXT)
    return notice(EMPTY_TEXT)
  }
  const map = (
    <MapPlan
      mode="lights"
      lamps={lamps}
      onMoveLamp={plan.moveItem}
      onToggleLamp={toggle}
      trees={plan.trees}
      hedges={plan.hedges}
      cage={plan.cage}
      offsets={plan.offsets}
      gates={PARCEL_GATES}
    />
  )
  return (
    <>
      {status === 'error' ? <Notice text={ERROR_TEXT} /> : null}
      {/* Sur téléphone (sous 1024 px) : la liste seule, pas de carte. */}
      {mobile ? null : (
        <Collapsible title={PLAN_SECTION_TITLE} defaultOpen>
          {map}
        </Collapsible>
      )}
      <LightsPanel
        rooms={zones}
        busy={busy}
        drafts={drafts}
        // La lampe de la perruche a en plus son bouton d'extinction en douceur (15 min), comme dans le détail de sa caméra.
        lampExtra={(light) =>
          light.id === CAMERA_LAMP['voliere-interieur'] ? <FadeButton apiKey={apiKey} lampId={light.id} on={light.on} /> : null
        }
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
