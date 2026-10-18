export interface SegmentedOption<T extends string> {
  id: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  /** Nom du groupe, lu par les lecteurs d'écran. */
  label: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (id: T) => void
}

export interface SegmentedItem<T extends string> {
  id: T
  label: string
  active: boolean
  className: string
}

export interface SegmentedControlUIProps<T extends string> {
  label: string
  items: SegmentedItem<T>[]
  onSelect: (id: T) => void
}
