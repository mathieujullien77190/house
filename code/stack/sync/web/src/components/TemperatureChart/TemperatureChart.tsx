import { useEffect, useState } from 'react'
import { MultiLineChart } from '@house/ui'
import { fetchTemperatures } from '@/lib/api'
import type { TemperaturePoint } from '@/types'
import { CHART_LABEL, DAYS, EMPTY_TEXT, END_LABEL, START_LABEL, UNIT } from './constants'
import { buildSeries } from './helpers'
import type { TemperatureChartProps } from './types'

/** Le graphique des températures des 7 derniers jours, sous la table `temperature_log` : une courbe par source, rechargée avec la page. */
const TemperatureChart = ({ refreshTick }: TemperatureChartProps) => {
  const [points, setPoints] = useState<TemperaturePoint[]>([])
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const result = await fetchTemperatures(DAYS)
        if (!cancelled) setPoints(result)
      } catch {
        // Le graphique garde ce qu'il montre ; le prochain rafraîchissement réessaie.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [refreshTick])
  return <MultiLineChart series={buildSeries(points)} unit={UNIT} label={CHART_LABEL} startLabel={START_LABEL} endLabel={END_LABEL} emptyText={EMPTY_TEXT} />
}

export default TemperatureChart
