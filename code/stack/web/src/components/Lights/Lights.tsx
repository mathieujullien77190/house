import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Collapsible, LightsPanel, LightsPlan, Notice, SpecList } from '@house/ui'
import { useMobile } from '@/lib/useMobile'
import { usePinchZoom } from '@/lib/usePinchZoom'
import { ApiError, fetchAutomations, fetchLampPositions, fetchLights, fetchSensors, saveLampPositions, setHue } from '@/lib/api'
import type { HueAutomation, HueRoom, HueSensor, HueState } from '@/types'
import { ALL_KEY, BACK_LABEL, AUTOMATIONS_POLL_MS, AUTOMATIONS_TITLE, EMPTY_TEXT, EXCLUDED_FROM_ALL, ERROR_TEXT, LOADING_TEXT, NOT_CONFIGURED_TEXT, PLAN_ROOMS, PLAN_SECTION_TITLE, PLAN_TITLE, PLAN_WALLS, POLL_MS, SAVE_DELAY_MS } from './constants'
import { allLights, buildAutomationItems, buildZones, clearLegacyPositions, defaultPositions, planLamps, readLegacyPositions } from './helpers'
import type { LightsProps, LightsStatus, Positions } from './types'

/**
 * Les lumières du pont Hue : le plan de la maison avec une ampoule par lampe (qu'on glisse pour la placer, qu'on touche pour
 * l'allumer), puis les zones de la maison et leurs lampes, relues toutes les 5 s. Allumer, éteindre ou régler la luminosité d'une
 * zone entière (lampe par lampe) ou d'une lampe ; le curseur envoie sa valeur au relâchement (le pont n'aime pas qu'on le noie).
 * Les positions des ampoules sont gardées par l'API : elles restent où on les a mises, sur tous les appareils.
 */
const Lights = ({ apiKey, onBack }: LightsProps) => {
  const [rooms, setRooms] = useState<HueRoom[]>([])
  const [sensors, setSensors] = useState<HueSensor[]>([])
  const [automations, setAutomations] = useState<HueAutomation[]>([])
  const [status, setStatus] = useState<LightsStatus>('loading')
  const mobile = useMobile()
  // Le zoom au doigt de l'écran du téléphone (le plan y est toujours en grand).
  const pinchZoom = usePinchZoom(mobile)
  const [busy, setBusy] = useState('')
  const [drafts, setDrafts] = useState<Record<string, number>>({})
  const [positions, setPositions] = useState<Positions>({})
  // Les positions déplacées et pas encore envoyées à l'API, et le délai avant de les envoyer.
  const pending = useRef<Positions>({})
  const timer = useRef<number | undefined>(undefined)

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

  // Les positions gardées par l'API. Celles que ce navigateur gardait avant (une version précédente) partent chez l'API une fois,
  // sans écraser ce qu'elle a déjà, puis sont effacées d'ici.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const saved = await fetchLampPositions(apiKey)
        const legacy = readLegacyPositions()
        const missing = Object.fromEntries(Object.entries(legacy).filter(([id]) => !saved[id]))
        const all = Object.keys(missing).length > 0 ? await saveLampPositions(apiKey, missing) : saved
        clearLegacyPositions()
        if (!cancelled) setPositions((current) => ({ ...all, ...current }))
      } catch {
        // Sans positions de l'API, les ampoules restent à leur place de départ.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiKey])

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

  // Les positions déplacées partent chez l'API quand le glisser s'arrête, et aussi si on quitte l'onglet avant.
  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    const changes = pending.current
    pending.current = {}
    if (Object.keys(changes).length > 0) void saveLampPositions(apiKey, changes).catch(() => undefined)
  }, [apiKey])
  useEffect(() => flush, [flush])

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
  const lamps = planLamps(lights, positions, defaultPositions(lights))

  const move = (id: string, x: number, y: number) => {
    setPositions((current) => ({ ...current, [id]: { x, y } }))
    pending.current[id] = { x, y }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, SAVE_DELAY_MS)
  }

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
  const changeZone = (id: string, state: HueState) => run(`room:${id}`, () => eachLight(zones.find((zone) => zone.id === id)?.lights ?? [], state))

  // Tout allumer ou tout éteindre : les lampes des zones (pas les lampes à placer, pas la volière) qui répondent, une par une.
  const changeAll = (on: boolean) =>
    run(ALL_KEY, () => eachLight(zones.filter((item) => !item.ungrouped && !EXCLUDED_FROM_ALL.includes(item.id)).flatMap((zone) => zone.lights), { on }))

  const toggle = (id: string) => {
    const light = lights.find((item) => item.id === id)
    if (light?.reachable) void changeLight(id, { on: !light.on })
  }

  const notice = (text: string) => (
    <>
      {mobile && onBack ? <Button onClick={onBack}>{BACK_LABEL}</Button> : null}
      <Notice text={text} />
    </>
  )
  if (rooms.length === 0) {
    if (status === 'unavailable') return notice(NOT_CONFIGURED_TEXT)
    if (status === 'error') return notice(ERROR_TEXT)
    if (status === 'loading') return notice(LOADING_TEXT)
    return notice(EMPTY_TEXT)
  }
  const plan = <LightsPlan title={PLAN_TITLE} rooms={PLAN_ROOMS} walls={PLAN_WALLS} lamps={lamps} onMove={move} onToggle={toggle} screen={mobile} gesture={pinchZoom} onBack={onBack} backLabel={BACK_LABEL} />
  // Sur téléphone (sous 1024 px) l'onglet est un écran : le plan seul, en plein écran paysage, sans titre ni menu ni liste.
  if (mobile) return plan
  return (
    <>
      {status === 'error' ? <Notice text={ERROR_TEXT} /> : null}
      <Collapsible title={PLAN_SECTION_TITLE} defaultOpen>
        {plan}
      </Collapsible>
      <LightsPanel
        rooms={zones}
        busy={busy}
        drafts={drafts}
        onAll={(on) => void changeAll(on)}
        onRoom={(id, state) => void changeZone(id, state)}
        onLight={(id, state) => void changeLight(id, state)}
        onDraft={(key, percent) => setDrafts((current) => ({ ...current, [key]: percent }))}
      />
      {automations.length > 0 ? (
        <Collapsible title={AUTOMATIONS_TITLE} detail={`${automations.filter((automation) => automation.enabled).length}/${automations.length} actives`} defaultOpen={!mobile}>
          <SpecList items={buildAutomationItems(automations)} />
        </Collapsible>
      ) : null}
    </>
  )
}

export default Lights
