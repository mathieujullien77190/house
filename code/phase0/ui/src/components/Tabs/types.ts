export interface TabOption<T extends string> {
  id: T
  label: string
}

export interface TabsProps<T extends string> {
  /** Nom du groupe, lu par les lecteurs d'écran. */
  label: string
  options: TabOption<T>[]
  /** L'onglet actif ; une valeur hors des options n'en active aucun. */
  value: T | ''
  onChange: (id: T) => void
}
