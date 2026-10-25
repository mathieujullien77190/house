export interface TabOption<T extends string> {
  id: T
  label: string
}

export interface TabsProps<T extends string> {
  /** Nom du groupe, lu par les lecteurs d'écran. */
  label: string
  options: TabOption<T>[]
  value: T
  onChange: (id: T) => void
}

export interface TabItem<T extends string> extends TabOption<T> {
  active: boolean
  className: string
}

export interface TabsUIProps<T extends string> {
  label: string
  items: TabItem<T>[]
  onSelect: (id: T) => void
}
