export interface HeatingSectionProps {
  apiKey: string
  /** Change quand la prise vient d'être commandée : le journal et l'état de la règle sont relus. */
  version: number
}

/** Les champs du formulaire, tels que la personne les tape. */
export interface HeatingForm {
  threshold: string
  minutes: string
  cooldown: string
  price: string
  peakPrice: string
  offPeakStart: string
  offPeakEnd: string
  watts: string
}
