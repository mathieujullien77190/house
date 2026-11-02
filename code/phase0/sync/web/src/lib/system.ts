import type { System } from '@/types'
import type { ChartModel } from './disk'
import { formatSize } from './format'

/** La mémoire : ce que les programmes utilisent et ce qui reste utilisable ; null si elle ne se lit pas. */
export const buildMemoryChart = (system: System): ChartModel | null => {
  if (!system.memory) return null
  const { total, available } = system.memory
  const used = Math.max(0, total - available)
  return {
    slices: [
      { id: 'used', label: 'Utilisée', value: used, display: formatSize(used), tone: 'accent' },
      { id: 'available', label: 'Disponible', value: available, display: formatSize(available), tone: 'line' },
    ],
    centerValue: formatSize(available),
    centerLabel: `disponibles sur ${formatSize(total)}`,
  }
}

/** Le processeur : la part utilisée et la part libre, sur un court intervalle ; null s'il ne se lit pas. */
export const buildCpuChart = (system: System): ChartModel | null => {
  if (!system.cpu) return null
  const { percent, threads, load1 } = system.cpu
  const used = Math.round(percent * 10) / 10
  return {
    slices: [
      { id: 'used', label: 'Utilisé', value: used, display: `${used.toFixed(1)} %`, tone: 'orange' },
      { id: 'free', label: 'Libre', value: 100 - used, display: `${(100 - used).toFixed(1)} %`, tone: 'line' },
    ],
    centerValue: `${used.toFixed(0)} %`,
    centerLabel: `utilisé · ${threads} threads · charge ${load1.toFixed(2)}`,
  }
}
