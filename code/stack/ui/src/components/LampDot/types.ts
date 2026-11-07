export interface LampDotProps {
  /** La lampe est allumée (une lampe injoignable se montre toujours éteinte : elle est coupée à l'interrupteur). */
  on: boolean
  /** La lampe répond au pont : sinon son contour est rouge pâle. */
  reachable: boolean
  /** Ce que lit un lecteur d'écran et ce que montre l'infobulle (« Lampe Perruche : allumée »). */
  label: string
}
