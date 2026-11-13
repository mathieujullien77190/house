export interface StepperProps {
  /** Nom de la ligne, utilisé dans les libellés accessibles. */
  label: string
  value: number
  onChange: (value: number) => void
}

export interface StepperUIProps {
  label: string
  value: number
  canDecrease: boolean
  onDecrease: () => void
  onIncrease: () => void
}
