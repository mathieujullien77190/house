import { BASE_CLASS, VARIANT_CLASS } from './constants'
import type { ButtonVariant } from './types'

export const buttonClass = (variant: ButtonVariant, extra = ''): string => {
  return `${BASE_CLASS} ${VARIANT_CLASS[variant]} ${extra}`.trim()
}
