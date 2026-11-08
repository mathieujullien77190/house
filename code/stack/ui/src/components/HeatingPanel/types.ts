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

/** Une ligne du journal, déjà en texte. */
export interface HeatingRow {
  id: string
  when: string
  origin: string
  duration: string
  temperature: string
  cost: string
}

export interface HeatingColumns {
  when: string
  origin: string
  duration: string
  temperature: string
  cost: string
}

export interface HeatingPanelProps {
  title: string
  enabledLabel: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  fields: HeatingField[]
  saveLabel: string
  saving: boolean
  onSave: () => void
  /** Pourquoi l'enregistrement a échoué. */
  error?: string | null
  /** Ce que la règle ferait maintenant. */
  status?: string | null
  /** Une phrase discrète sous les champs. */
  note?: string | null
  logTitle: string
  columns: HeatingColumns
  rows: HeatingRow[]
  emptyText: string
  /** Le pied du journal : le total des lignes affichées. */
  total?: { label: string; value: string } | null
}
