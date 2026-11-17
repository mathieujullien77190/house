// Les étiquettes de température du plan : celle de dehors (la météo) et une par pièce climatisée. Les détecteurs Hue ne sont plus des étiquettes : ce sont des ronds (`useSensorPlan`).
// Placées d'après le plan (`items`, clé `label-<id>`) ou à leur place de départ ; seules celles dont la température est connue s'écrivent.
import type { PlanAc, PlanLabel } from '@house/ui'
import { fromHousePlan, temperatureText } from '@/components/MapPlan/helpers'
import { HOUSE_LATITUDE, HOUSE_LONGITUDE } from '@/components/Weather/constants'
import { useWeather } from '@/lib/useWeather'

/** La clé de la position d'une étiquette dans les éléments du plan. */
export const labelItemId = (id: string): string => `label-${id}`

/** Où se pose l'étiquette de dehors au départ : devant la maison, au sud, dans le repère de l'ancien plan (540 × 300, converti à la lecture). À déplacer à la main. */
const OUTSIDE_START = { x: 270, y: 335 }
/** L'étiquette de la température d'une pièce se pose sous l'icône de sa climatisation, à cette distance (unités du plan). */
const ROOM_LABEL_DROP = 18

export const useTemperatureLabels = (
  items: Record<string, { x: number; y: number }>,
  acs: PlanAc[],
): PlanLabel[] => {
  const weather = useWeather(HOUSE_LATITUDE, HOUSE_LONGITUDE)
  const place = (id: string, start: { x: number; y: number }) => items[labelItemId(id)] ?? start
  return [
    {
      id: 'dehors',
      name: 'Dehors',
      ...place('dehors', fromHousePlan(OUTSIDE_START.x, OUTSIDE_START.y)),
      text: weather ? temperatureText(Math.round(weather.temperature)) : '',
    },
    // La température de chaque pièce (celle que lit sa climatisation) : une étiquette sous l'icône de la climatisation, qu'on déplace comme les autres.
    ...acs.map((ac) => ({
      id: `piece-${ac.id}`,
      name: ac.name,
      ...place(`piece-${ac.id}`, { x: ac.x, y: ac.y + ROOM_LABEL_DROP }),
      text: ac.temperature == null ? '' : temperatureText(ac.temperature),
    })),
  ]
}
