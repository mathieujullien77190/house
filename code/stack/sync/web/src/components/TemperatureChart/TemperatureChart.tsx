import { useEffect, useState } from 'react'
import { MultiLineChart, Tabs } from '@house/ui'
import { fetchTemperatures } from '@/lib/api'
import type { TemperaturePoint } from '@/types'
import { CHART_LABEL, DAY_SECONDS, DEFAULT_RANGE, EMPTY_TEXT, RANGE_DAYS, RANGES, RANGES_LABEL, UNIT } from './constants'
import type { RangeId } from './constants'
import { buildSeries, timeLabels } from './helpers'
import type { TemperatureChartProps } from './types'

/** Le graphique des températures (24 h, semaine, mois ou année au choix), sous la table `temperature_log` : une courbe par source, rechargée avec la page. */
const TemperatureChart = ({ refreshTick }: TemperatureChartProps) => {
  const [points, setPoints] = useState<TemperaturePoint[]>([])
  // L'instant de la dernière lecture : la fenêtre du graphique va de là à N jours en arrière.
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const [range, setRange] = useState<RangeId>(DEFAULT_RANGE)
  const days = RANGE_DAYS[range]
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const result = await fetchTemperatures(days)
        if (!cancelled) {
          setPoints(result)
          setNow(Math.floor(Date.now() / 1000))
        }
      } catch {
        // Le graphique garde ce qu'il montre ; le prochain rafraîchissement réessaie.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [refreshTick, days])
  return (
    <div>
      <Tabs label={RANGES_LABEL} options={RANGES.map(({ id, label }) => ({ id, label }))} value={range} onChange={setRange} compact />
      <MultiLineChart
        series={buildSeries(points)}
        unit={UNIT}
        label={CHART_LABEL}
        domain={{ from: now - days * DAY_SECONDS, to: now }}
        timeLabels={timeLabels(now, days)}
        emptyText={EMPTY_TEXT}
      />
    </div>
  )
}

export default TemperatureChart
