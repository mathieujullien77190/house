export interface HeatingField {
  id: string
  label: string
  /** Ce que la personne voit et tape (le parent le convertit). */
  value: string
  /** `number` : un entier ; `decimal` : un nombre avec virgule ou point ; `time` : une heure HH:MM. */
  kind: 'number' | 'decimal' | 'time'
  /** Une aide courte sous le champ. */
  hint?: string
  onChange: (value: string) => void
}

export interface HeatingPanelProps {
  enabledLabel: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  fields: HeatingField[]
  saveLabel: string
  saving: boolean
  onSave: () => void
  /** Pourquoi l'enregistrement a échoué. */
  error?: string | null
  /** Pour un bloc étroit (l'aperçu du chauffage sur la carte) : deux colonnes quelle que soit la largeur de l'écran, textes plus petits. */
  compact?: boolean
}
