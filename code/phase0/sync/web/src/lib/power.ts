import type { Total } from '@house/ui'
import type { Power } from '@/types'

const formatWatts = (watts: number): string => `${watts.toFixed(1)} W`

/** Les chiffres de l'onglet Énergie : le processeur, les caméras (PoE) et leur somme, seulement ce qui est mesuré. */
export const buildPowerTotals = (power: Power): Total[] => {
  const cpu = power.cpu?.watts ?? null
  const cameras = power.cameras?.reduce((sum, camera) => sum + camera.watts, 0) ?? null
  const measured = [cpu, cameras].filter((value): value is number => value !== null)
  const detail = power.cameras?.map((camera) => `${camera.camera} ${formatWatts(camera.watts)}`).join(' · ')
  return [
    { id: 'cpu', value: cpu === null ? '—' : formatWatts(cpu), label: cpu === null ? 'processeur : mesure indisponible' : 'processeur du mini PC (compteur RAPL)' },
    {
      id: 'cameras',
      value: cameras === null ? '—' : formatWatts(cameras),
      label: cameras === null ? `caméras : ${power.camerasError ?? 'indisponible'}` : `caméras (PoE du switch)${detail ? ` : ${detail}` : ''}`,
    },
    { id: 'total', value: measured.length ? formatWatts(measured.reduce((sum, value) => sum + value, 0)) : '—', label: 'total mesuré' },
  ]
}
