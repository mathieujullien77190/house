// Les climatisations Mitsubishi prêtes pour la carte : relues toutes les 10 s tant que `enabled`, placées d'après le plan (`items`, clé `ac-<id>`) ou, à défaut, à leur place de
// départ dans la pièce. Vide sans climatisation configurée ou avant la première réponse.
import { useEffect, useState } from 'react'
import type { PlanAc } from '@house/ui'
import { degrees, stateText } from '@/components/AcPanel/helpers'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { fetchAc } from '@/lib/api'
import type { AcUnit } from '@/types'

const REFRESH_MS = 10_000

/** La clé de la position d'une climatisation dans les éléments du plan. */
export const acItemId = (id: string): string => `ac-${id}`

/** La place de départ de chaque climatisation, dans le repère de l'ancien plan de la maison (540 × 300, converti à la lecture) : au mur de sa pièce. À déplacer à la main. */
const START_POSITIONS: Record<string, { x: number; y: number }> = {
  salon: { x: 345, y: 150 },
  'chambre-invite': { x: 105, y: 198 },
  'chambre-matou': { x: 67, y: 10 },
}
/** L'orientation de l'icône de chaque climatisation (degrés, sens horaire) : le salon d'un quart de tour horaire, la chambre matou d'un quart de tour trigonométrique ; les autres à l'endroit. */
const ROTATIONS: Record<string, number> = { salon: 90, 'chambre-matou': -90 }
/** Une climatisation inconnue de la liste ci-dessus : posée dans le salon, les suivantes côte à côte. */
const FALLBACK = { x: 300, y: 260 }
const FALLBACK_STEP = 40

/** Le texte du survol : « Salon · Allumée · Chaud · pièce 20 °C · consigne 21 °C ». */
const labelOf = (unit: AcUnit): string =>
  !unit.reachable
    ? `${unit.name} · ne répond pas`
    : `${unit.name} · ${stateText(unit)}${unit.power ? ` · consigne ${degrees(unit.targetTemp)}` : ''}`

export const useAcPlan = (apiKey: string, items: Record<string, { x: number; y: number }>, enabled: boolean): PlanAc[] => {
  const [units, setUnits] = useState<AcUnit[]>([])

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () =>
      fetchAc(apiKey)
        .then((list) => {
          if (alive) setUnits(list)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey, enabled])

  let fallback = 0
  const acs = units.map((unit): PlanAc => {
    const start = START_POSITIONS[unit.id]
    const place =
      items[acItemId(unit.id)] ??
      (start ? fromHousePlan(start.x, start.y) : fromHousePlan(FALLBACK.x + FALLBACK_STEP * fallback++, FALLBACK.y))
    return {
      id: unit.id,
      name: unit.name,
      ...place,
      on: unit.power,
      reachable: unit.reachable,
      temperature: unit.reachable ? unit.roomTemp : null,
      rotation: ROTATIONS[unit.id] ?? 0,
      label: labelOf(unit),
    }
  })
  return acs
}
