export interface LampDotProps {
  /** La lampe est allumée (une lampe injoignable se montre toujours éteinte : elle est coupée à l'interrupteur). */
  on: boolean
  /** La lampe répond au pont : sinon son contour est rouge pâle. */
  reachable: boolean
  /** La luminosité (1 à 254, Hue) : le rond allumé est d'autant plus pâle qu'elle est basse ; absente ou nulle : plein. */
  brightness?: number | null
  /** Ce que lit un lecteur d'écran et ce que montre l'infobulle (« Lampe Perruche : allumée »). */
  label: string
}
