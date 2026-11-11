import type { GuestLinkInfo } from '@/lib/api'

export interface GuestLinkProps {
  /** De quoi bâtir le lien (clé, port, adresse publique éventuelle), donné par `GET /api/guest`. */
  info: GuestLinkInfo
}

/** Ce qui est arrivé au dernier clic sur « Copier le lien ». */
export type CopyState = 'idle' | 'copied' | 'failed'

export interface GuestLinkUIProps {
  link: string
  copy: CopyState
  onCopy: () => void
}
