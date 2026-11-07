export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  /** Nom de la liste, lu par les lecteurs d'écran. */
  label: string
  options: SelectOption[]
  /** La valeur choisie ; une valeur hors des options montre le texte `placeholder`. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
}
