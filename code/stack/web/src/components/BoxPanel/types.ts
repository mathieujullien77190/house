import type { ReactNode } from 'react'
import type { BoxGuests, BoxState } from '@/types'

export interface BoxPanelProps {
  apiKey: string
}

export interface GuestsBlockProps {
  guests: BoxGuests
  /** La MAC dont une action est en route (boutons grisés), et le texte de la dernière erreur. */
  busy: string | null
  error: string | null
  onExclude: (mac: string, excluded: boolean) => void
}

export interface BoxBlockProps {
  box: BoxState
  /** Un ordre WiFi est en route : l'interrupteur est grisé. */
  busy: boolean
  /** Le dernier ordre WiFi a échoué. */
  failed: boolean
  /** Dans l'aperçu de la carte : seulement les appareils connectés, sans filtre. */
  compact?: boolean
  onWifi: (enabled: boolean) => void
  /** Posé en bas du bloc « WiFi » (le WiFi invité et son mot de passe, dans l'onglet Box). */
  wifiExtra?: ReactNode
}
