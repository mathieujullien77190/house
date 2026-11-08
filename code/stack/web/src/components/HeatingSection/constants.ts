export const TITLE = 'Chauffage automatique'
export const ENABLED_LABEL = 'Activer la règle'
export const SAVE_LABEL = 'Enregistrer'
export const LOG_TITLE = 'Journal des activations'
export const EMPTY_TEXT = 'Aucune activation pour l’instant.'
export const TOTAL_LABEL = 'Total des activations affichées :'
export const INVALID_TEXT = 'Vérifiez les valeurs : des nombres entiers pour les durées, la puissance et la température, des heures HH:MM.'
export const SAVE_ERROR_TEXT = 'Les réglages n’ont pas été enregistrés.'
export const NO_COST = '–'

export const COLUMNS = { when: 'Quand', origin: 'Origine', duration: 'Durée', temperature: 'Température', cost: 'Coût' }

export const FIELD_LABELS = {
  threshold: 'Température (°C)',
  minutes: 'Durée (min)',
  cooldown: 'Délai avant réactivation (min)',
  price: 'Prix du kWh heures creuses (€ TTC)',
  peakPrice: 'Prix du kWh heures pleines (€ TTC)',
  offPeakStart: 'Début des heures creuses',
  offPeakEnd: 'Fin des heures creuses',
  watts: 'Puissance du chauffage (W)',
}
export const WATTS_HINT = 'pour chiffrer le coût'
export const COOLDOWN_HINT = 'compté depuis le début d’une activation'

export const ORIGIN_LABELS = { auto: 'Automatique', manuel: 'Manuel' } as const

export const STATUS_TEXTS = {
  off: 'Règle désactivée',
  unknown: 'Température inconnue',
  day: 'Il fait jour',
  warm: 'Pas assez froid',
  heat: 'Froid et nuit : la règle chauffera',
}
export const UNKNOWN_HOURS_NOTE = 'Plages d’heures creuses non renseignées : tout est compté au tarif creux.'
