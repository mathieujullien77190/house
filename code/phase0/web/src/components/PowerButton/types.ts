import type { CameraPower } from '@/types'

export interface PowerButtonProps {
  apiKey: string
  /** Le nom de la caméra, tel que House API le connaît (ses ports sont réglés côté API). */
  camera: string
  /** L'alimentation lue sur le switch (usePower) ; null sans switch configuré : rien ne s'affiche. */
  power: CameraPower | null
  /** Appelé avec le nouvel état après un changement réussi. */
  onPower: (power: CameraPower) => void
}
