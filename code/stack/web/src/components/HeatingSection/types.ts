export interface HeatingSectionProps {
  apiKey: string
  /** Change quand la prise vient d'être commandée : le journal et l'état de la règle sont relus. */
  version: number
  /** Dans le bloc étroit de la carte de Home : deux colonnes, textes plus petits. */
  compact?: boolean
}

/** Les champs du formulaire, tels que la personne les tape. */
export interface HeatingForm {
  threshold: string
  minutes: string
  cooldown: string
}
