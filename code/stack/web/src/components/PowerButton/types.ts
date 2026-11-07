import type { CameraPower } from '@/types'

export interface PowerButtonProps {
  apiKey: string
  /** Le nom de la caméra, tel que House API le connaît (ses ports sont réglés côté API). */
  camera: string
  /** L'alimentation lue sur le switch (usePower) ; null sans switch configuré : rien ne s'affiche. */
  power: CameraPower | null
  /** Le switch est configuré mais ne répond pas : le bouton se montre grisé, avec la raison, au lieu de disparaître. */
  unavailable?: boolean
  /** Sur téléphone, on ne coupe pas une caméra d'un doigt par mégarde : la caméra allumée n'a pas de bouton « Éteindre » (l'éteinte garde « Allumer »). */
  hideOff?: boolean
  /** Appelé avec le nouvel état après un changement réussi. */
  onPower: (power: CameraPower) => void
}
