// Les étiquettes de température du plan : celle de dehors (la météo) et deux dans la cage à perruches (les détecteurs Hue, ceux dont la température est sur la vidéo de chaque caméra
// de la volière). Placées d'après le plan (`items`, clé `label-<id>`) ou à leur place de départ ; seules celles dont la température est connue s'écrivent. Les détecteurs sont relus
// toutes les 30 s tant que `enabled`.
import { useEffect, useState } from 'react'
import type { PlanAc, PlanLabel } from '@house/ui'
import { CAMERA_SENSOR } from '@/components/CameraCard/constants'
import { fromHousePlan, temperatureText } from '@/components/MapPlan/helpers'
import { HOUSE_LATITUDE, HOUSE_LONGITUDE } from '@/components/Weather/constants'
import { fetchSensors } from '@/lib/api'
import { useWeather } from '@/lib/useWeather'
import type { HueSensor } from '@/types'

const REFRESH_MS = 30_000

/** La clé de la position d'une étiquette dans les éléments du plan. */
export const labelItemId = (id: string): string => `label-${id}`

/** Où se pose l'étiquette de dehors au départ : devant la maison, au sud, dans le repère de l'ancien plan (540 × 300, converti à la lecture). À déplacer à la main. */
const OUTSIDE_START = { x: 270, y: 335 }
/** L'étiquette de la température d'une pièce se pose sous l'icône de sa climatisation, à cette distance (unités du plan). */
const ROOM_LABEL_DROP = 18

export const useTemperatureLabels = (
  apiKey: string,
  items: Record<string, { x: number; y: number }>,
  cage: { x: number; y: number; w: number; h: number },
  acs: PlanAc[],
  enabled: boolean,
): PlanLabel[] => {
  const weather = useWeather(HOUSE_LATITUDE, HOUSE_LONGITUDE)
  const [sensors, setSensors] = useState<HueSensor[]>([])

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () =>
      fetchSensors(apiKey)
        .then((list) => {
          if (alive) setSensors(list)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey, enabled])

  const sensorText = (id: string): string => {
    const temperature = sensors.find((sensor) => sensor.id === id && sensor.reachable)?.temperature
    return temperature === null || temperature === undefined ? '' : temperatureText(temperature)
  }
  const place = (id: string, start: { x: number; y: number }) => items[labelItemId(id)] ?? start
  const middle = cage.x + cage.w / 2
  return [
    {
      id: 'dehors',
      name: 'Dehors',
      ...place('dehors', fromHousePlan(OUTSIDE_START.x, OUTSIDE_START.y)),
      text: weather ? temperatureText(Math.round(weather.temperature)) : '',
    },
    // Dans la cage : celle du détecteur de l'extérieur de la volière en haut, celle de l'intérieur en bas (comme les deux caméras).
    {
      id: 'cage-exterieur',
      name: 'Cage, extérieur',
      ...place('cage-exterieur', { x: middle, y: cage.y + cage.h * 0.28 }),
      text: sensorText(CAMERA_SENSOR['voliere-exterieur']),
    },
    // La température de chaque pièce (celle que lit sa climatisation) : une étiquette sous l'icône de la climatisation, qu'on déplace comme les autres.
    ...acs.map((ac) => ({
      id: `piece-${ac.id}`,
      name: ac.name,
      ...place(`piece-${ac.id}`, { x: ac.x, y: ac.y + ROOM_LABEL_DROP }),
      text: ac.temperature == null ? '' : temperatureText(ac.temperature),
    })),
    {
      id: 'cage-interieur',
      name: 'Cage, intérieur',
      ...place('cage-interieur', { x: middle, y: cage.y + cage.h * 0.72 }),
      text: sensorText(CAMERA_SENSOR['voliere-interieur']),
    },
  ]
}
