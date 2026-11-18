/** La réponse de `GET /guest-lan/link` : l'adresse de la page « Chez Matou » (clé comprise, null sans LAN_KEY) et l'état en lecture seule des interrupteurs de House Sync. */
export interface GuestLanLink {
  configured: boolean
  url: string | null
  enabled: boolean
  cameras: boolean
  shutters: boolean
  lights: boolean
  ac: boolean
}

export interface GuestPanelProps {
  apiKey: string
}

/** Ce qui est arrivé au dernier clic sur « Copier ». */
export type CopyState = 'idle' | 'copied' | 'failed'

export interface GuestPanelUIProps {
  link: GuestLanLink | null
  problem: 'loading' | 'off' | null
  /** L'adresse de l'aperçu (la page de cette même origine, avec la clé) ; null sans clé. */
  previewUrl: string | null
  copy: CopyState
  onCopy: (url: string) => void
}
