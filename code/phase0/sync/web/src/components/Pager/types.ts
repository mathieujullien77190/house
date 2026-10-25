export interface PagerProps {
  /** Page courante, à partir de 0. */
  page: number
  size: number
  total: number
  onPage: (page: number) => void
}

export interface PagerUIProps {
  text: string
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
}
