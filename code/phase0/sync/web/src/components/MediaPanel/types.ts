import type { Media } from '@/types'

export interface MediaPanelProps {
  media: Media
  onClose: () => void
}

export interface MediaPanelUIProps {
  media: Media
  src: string
  onClose: () => void
}
