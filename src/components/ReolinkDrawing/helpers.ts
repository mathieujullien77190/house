import { IR_LED_X, IR_LED_YS } from './constants'
import type { IrLed } from './types'

export const irLedPoints = (): IrLed[] => {
  return IR_LED_YS.map((cy) => ({ cx: IR_LED_X, cy }))
}
