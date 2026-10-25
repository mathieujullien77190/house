import type { Media } from '@/types'

export interface ClipsSectionProps {
  /** Change à chaque rafraîchissement demandé par la page. */
  refreshTick: number
  onOpen: (media: Media) => void
}
