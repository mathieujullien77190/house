import type { ButtonVariant } from './types'

export const DEFAULT_VARIANT: ButtonVariant = 'default'

export const BASE_CLASS =
  'cursor-pointer rounded-lg border px-3 py-1 text-[0.9rem] hover:enabled:border-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: 'border-line bg-bg text-fg',
  active: 'border-accent bg-accent text-white',
  danger: 'border-line bg-bg text-danger',
}
