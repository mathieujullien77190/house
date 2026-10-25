import type { CameraPower } from '@/types'
import { STATUS_OFF, STATUS_ON, STATUS_POWERED, STATUS_STARTING, STATUS_STOPPING } from './constants'

/** L'état en mots : en marche (avec la puissance lue), en train de démarrer (courant, puis flux) ou éteinte. */
export const statusText = (power: CameraPower): string => {
  if (!power.on) return power.powered ? STATUS_STOPPING : STATUS_OFF
  if (!power.powered) return STATUS_STARTING
  if (!power.streaming) return STATUS_POWERED
  return `${STATUS_ON} · ${power.watts.toLocaleString('fr-FR')} W`
}
