import type { GuestInfo } from '@/types'

export interface GuestLinkProps {
  apiKey: string
}

/** Ce qui est arrivé au dernier clic sur « Copier ». */
export type CopyState = 'idle' | 'copied' | 'failed'

export interface GuestLinkUIProps {
  link: string
  copy: CopyState
  onCopy: () => void
}

export type { GuestInfo }
