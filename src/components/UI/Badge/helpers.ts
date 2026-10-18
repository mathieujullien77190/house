import { BASE_CLASS, TONE_CLASS } from './constants'
import type { BadgeTone } from './types'

export const badgeClass = (tone: BadgeTone): string => {
  return `${BASE_CLASS} ${TONE_CLASS[tone]}`
}
