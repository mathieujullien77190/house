export interface SpecItem {
  id: string
  label: string
  /** La valeur, déjà mise en forme. */
  value: string
}

export interface SpecListProps {
  items: SpecItem[]
}
