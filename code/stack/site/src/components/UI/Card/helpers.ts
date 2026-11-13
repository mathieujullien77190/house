import { CARD_CLASS } from './constants'

export const cardClass = (extra = ''): string => {
  return `${CARD_CLASS} ${extra}`.trim()
}
