export interface PortraitClipProps {
  apiKey: string
  /** L'adresse du clip à lire. */
  path: string
  audioSrc?: string
  onClose: () => void
}
