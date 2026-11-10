import type { AcUnit } from '@/types'
import { MODE_LABELS, OFF_TEXT, ON_TEXT, ROOM_LABEL, TARGET_MAX, TARGET_MIN, TARGET_STEP } from './constants'

/** Une température en °C, à la française (« 22,5 °C »), ou un tiret si elle est inconnue. */
export const degrees = (value: number | null): string => (value === null ? '–' : `${value.toLocaleString('fr-FR')} °C`)

/** L'état d'une unité en une phrase : « Allumée · Chaud · pièce 19 °C ». */
export const stateText = (unit: AcUnit): string =>
  [
    unit.power ? ON_TEXT : OFF_TEXT,
    unit.mode ? MODE_LABELS[unit.mode] : null,
    unit.roomTemp === null ? null : `${ROOM_LABEL} ${degrees(unit.roomTemp)}`,
  ]
    .filter(Boolean)
    .join(' · ')

/** La consigne après un clic sur − ou + (un pas de 0,5 °C), gardée entre 16 et 31 °C . */
export const stepTarget = (target: number, direction: -1 | 1): number => Math.min(TARGET_MAX, Math.max(TARGET_MIN, target + direction * TARGET_STEP))
