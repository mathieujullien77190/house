import type { HueLight } from '@/types'
import { LAMP_NAME, LAMP_OFF_TEXT, LAMP_ON_TEXT, LAMP_UNREACHABLE_TEXT } from './constants'

/** L'infobulle du rond : « Lampe Perruche : allumée ». */
export const lampLabel = (lamp: HueLight): string => `Lampe ${LAMP_NAME} : ${!lamp.reachable ? LAMP_UNREACHABLE_TEXT : lamp.on ? LAMP_ON_TEXT : LAMP_OFF_TEXT}`
