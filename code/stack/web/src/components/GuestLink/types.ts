import type { GuestInfo } from '@/types'

export interface GuestLinkProps {
  apiKey: string
  /** Dans le menu sandwich du téléphone : sans marge du haut, aligné sur les autres éléments du menu. */
  menu?: boolean
}

/** Ce qui est arrivé au dernier clic sur « Copier ». */
export type CopyState = 'idle' | 'copied' | 'failed'

export interface GuestLinkUIProps {
  link: string
  copy: CopyState
  onCopy: () => void
  menu?: boolean
}

export type { GuestInfo }
