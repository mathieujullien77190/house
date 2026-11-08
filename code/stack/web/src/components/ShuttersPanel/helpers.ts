import type { ShutterInfo } from '@/types'
import { COMMAND_LABELS, LAST_LABEL, NEVER_TEXT } from './constants'

/** Le dernier ordre d'un volet en une phrase : « Dernier ordre : Monter, à 08:12 » (l'heure locale), ou qu'il n'y en a jamais eu. */
export const lastText = (shutter: ShutterInfo): string => {
  if (shutter.lastCommand === null || shutter.lastAt === null) return NEVER_TEXT
  const time = new Date(shutter.lastAt * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${LAST_LABEL} : ${COMMAND_LABELS[shutter.lastCommand]}, à ${time}`
}
