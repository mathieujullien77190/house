export interface ValueChipsProps {
  /** Les valeurs déjà mises en forme (« 9,5 °C »), dans l'ordre d'affichage : un bloc chacune. */
  values: string[]
  /** Le bloc se colle à droite de sa ligne, à la hauteur d'un `Button` (40 px) : l'heure de la frise sur téléphone. */
  stretch?: boolean
}
