import type { SpecItem } from '@house/ui'
import type { Specs } from '@/types'
import { formatSize } from './format'

const SECONDS_PER_DAY = 86_400
const SECONDS_PER_HOUR = 3_600

/** Une durée en jours, heures et minutes (« 2 j 3 h 12 min »), sans les unités à zéro en tête. */
export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / SECONDS_PER_DAY)
  const hours = Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR)
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / 60)
  return [days ? `${days} j` : '', days || hours ? `${hours} h` : '', `${minutes} min`].filter(Boolean).join(' ')
}

/** Les lignes de la liste des caractéristiques ; une ligne manque quand la mesure manque. */
export const buildSpecItems = (specs: Specs): SpecItem[] => {
  const { cpu, disk } = specs
  const items: (SpecItem | null)[] = [
    { id: 'machine', label: 'Machine', value: [specs.hostname, specs.bios ? `BIOS ${specs.bios}` : ''].filter(Boolean).join(' · ') },
    { id: 'os', label: 'Système', value: [specs.os, `noyau ${specs.kernel}`, specs.architecture].filter(Boolean).join(' · ') },
    cpu
      ? {
          id: 'cpu',
          label: 'Processeur',
          value: `${cpu.model} · ${cpu.cores} cœurs, ${cpu.threads} threads${cpu.maxMhz ? ` · jusqu’à ${(cpu.maxMhz / 1000).toFixed(1)} GHz` : ''}`,
        }
      : null,
    specs.memory ? { id: 'memory', label: 'Mémoire', value: `${formatSize(specs.memory)} vus par le système` } : null,
    disk ? { id: 'disk', label: 'Disque', value: `${disk.model} · ${formatSize(disk.size)} · ${disk.rotational ? 'disque dur' : 'SSD'}` } : null,
    { id: 'uptime', label: 'Allumé depuis', value: formatUptime(specs.uptimeSeconds) },
  ]
  return items.filter((item): item is SpecItem => item !== null && item.value !== '')
}
