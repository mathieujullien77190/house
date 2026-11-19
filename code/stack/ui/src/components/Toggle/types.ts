export interface ToggleProps {
  /** Nom du réglage, lu par les lecteurs d'écran. */
  label: string
  checked: boolean
  /** Le nouvel état, appelé seulement quand il change. */
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Le texte du choix « allumé » (Marche par défaut). */
  onText?: string
  /** Le texte du choix « éteint » (Arrêt par défaut). */
  offText?: string
}
