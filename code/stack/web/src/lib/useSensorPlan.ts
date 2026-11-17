// Les détecteurs de mouvement du pont Hue prêts pour la carte : relus toutes les 30 s tant que `enabled` (`useSensors`), placés d'après le plan (`items`, clé `sensor-<id>`) ou, à défaut,
// à leur place de départ : les deux détecteurs de la cage dans la cage (là où sont leurs étiquettes de température, dont on reprend la place gardée), « motion sdb » dans la salle de bain.
// Un détecteur sans place de départ (nouveau) n'est pas sur la carte tant qu'on ne l'a pas placé. La température reste exacte : l'arrondi n'est qu'au dessin.
import type { PlanSensor } from '@house/ui'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { useSensors } from '@/lib/useSensors'
import { labelItemId } from '@/lib/useTemperatureLabels'
import type { HueSensor } from '@/types'

/** La clé de la position d'un détecteur dans les éléments du plan. */
export const sensorItemId = (id: string): string => `sensor-${id}`

/** La place de départ de « motion sdb » (identifiant 60 du pont), dans le repère de l'ancien plan de la maison (540 × 300, converti à la lecture) : au milieu de la salle de bain. À déplacer à la main. */
const SDB_START = { x: 172, y: 100 }
/** Les détecteurs de la cage : leur identifiant du pont, la place gardée de leur ancienne étiquette (reprise) et leur hauteur de départ dans la cage (part de sa hauteur). */
const CAGE_SENSORS: Record<string, { label: string; at: number }> = {
  '57': { label: 'cage-exterieur', at: 0.28 },
  '54': { label: 'cage-interieur', at: 0.72 },
}
/** Le décalage à gauche du milieu de la cage (part de sa largeur), pour ne pas cacher l'étiquette de température. */
const CAGE_SHIFT = 0.28

const startOf = (
  sensor: HueSensor,
  items: Record<string, { x: number; y: number }>,
  cage: { x: number; y: number; w: number; h: number },
): { x: number; y: number } | null => {
  const kept = items[sensorItemId(sensor.id)]
  if (kept) return kept
  const inCage = CAGE_SENSORS[sensor.id]
  if (inCage) {
    const label = items[labelItemId(inCage.label)]
    return label ?? { x: cage.x + cage.w * (0.5 - CAGE_SHIFT), y: cage.y + cage.h * inCage.at }
  }
  return sensor.id === '60' ? fromHousePlan(SDB_START.x, SDB_START.y) : null
}

/** Les détecteurs posés sur la carte (une température exacte, ou null). */
export const planSensors = (
  sensors: HueSensor[],
  items: Record<string, { x: number; y: number }>,
  cage: { x: number; y: number; w: number; h: number },
): PlanSensor[] =>
  sensors.flatMap((sensor): PlanSensor[] => {
    const at = startOf(sensor, items, cage)
    return at ? [{ id: sensor.id, name: sensor.name, ...at, temperature: sensor.temperature, reachable: sensor.reachable }] : []
  })

export const useSensorPlan = (
  apiKey: string,
  items: Record<string, { x: number; y: number }>,
  cage: { x: number; y: number; w: number; h: number },
  enabled: boolean,
): PlanSensor[] => planSensors(useSensors(apiKey, enabled), items, cage)
