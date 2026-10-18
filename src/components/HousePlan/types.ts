import type { Floor } from '@/nodes'

import type { Room } from '@/plan'

export type { Rect, Room } from '@/plan'

export interface HousePlanProps {
  /** Étage affiché. */
  floor: Floor
}

export interface HousePlanUIProps {
  floor: Floor
  rooms: Room[]
  /** Ordonnées des marches de l'escalier. */
  steps: number[]
}
