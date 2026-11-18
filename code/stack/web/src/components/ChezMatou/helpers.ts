import type { LightsRoom } from '@house/ui'
import { allLights, buildZones } from '@/components/Lights/helpers'
import type { AcUnit, HueRoom, ShutterCommand, ShutterInfo } from '@/types'
import { COMMANDS_ALLOWED } from './constants'
import type { LanAcUnit, LanProblem, LanShutter } from './types'

/** Les zones de lampes de l'onglet Lumière (mêmes `ZONES`, une lampe injoignable compte pour éteinte), sans curseur de luminosité (`bri` à null) ni détecteur : la page ne laisse qu'allumer ou éteindre. */
export const lanRooms = (rooms: HueRoom[]): LightsRoom[] =>
  buildZones(allLights(rooms)).map((room) => ({ ...room, bri: null, sensors: undefined, lights: room.lights.map((light) => ({ ...light, bri: null })) }))

/** Les volets tels que `ShutterCard` les attend : sans réglage automatique ni « fermer à moitié ». */
export const lanShutters = (shutters: LanShutter[]): ShutterInfo[] =>
  shutters.map(({ id, name, lastCommand }) => ({
    id,
    name,
    lastCommand: COMMANDS_ALLOWED.includes(lastCommand as ShutterCommand) ? (lastCommand as ShutterCommand) : null,
    lastAt: null,
    auto: null,
    closeSeconds: null,
    halfRunning: false,
  }))

/** Les climatisations telles que `AcUnitCard` les attend : les ailettes ne sont pas réglables ici. */
export const lanAcUnits = (units: LanAcUnit[]): AcUnit[] => units.map((unit) => ({ ...unit, vane: null, wideVane: null }))

/** Le problème d'après la réponse de l'API : 401 clé fausse, 403 « désactivé » (interrupteur de House Sync) ou « réseau local seulement », 503 sans LAN_KEY, 429 trop d'essais. */
export const problemOf = (status: number, message: string): LanProblem => {
  if (status === 401 || status === 429) return 'locked'
  if (status === 403) return message === 'désactivé' ? 'disabled' : 'outside'
  if (status === 503) return 'unconfigured'
  return 'unreachable'
}
