import type { BadgeTone } from './types'

export const BASE_CLASS = 'whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.72rem]'

export const TONE_CLASS: Record<BadgeTone, string> = {
  repo: 'text-pi',
  estimation: 'text-backup',
  perso: 'text-camera',
}
