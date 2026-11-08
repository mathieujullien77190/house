import type { CameraPower } from '@/types'
import { STATUS_OFF, STATUS_POWERED, STATUS_STARTING, STATUS_STOPPING } from './constants'

/** L'état en mots quand il mérite d'être dit : en train de démarrer (courant, puis flux), en train de s'éteindre ou éteinte ; en marche, rien (le bouton « Éteindre » suffit). */
export const statusText = (power: CameraPower): string => {
  if (!power.on) return power.powered ? STATUS_STOPPING : STATUS_OFF
  if (!power.powered) return STATUS_STARTING
  if (!power.streaming) return STATUS_POWERED
  return ''
}
