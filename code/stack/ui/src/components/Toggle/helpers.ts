import type { TabOption } from '../Tabs'

export type ToggleId = 'on' | 'off'

export const toggleOptions = (onText: string, offText: string): TabOption<ToggleId>[] => [
  { id: 'off', label: offText },
  { id: 'on', label: onText },
]
