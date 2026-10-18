import type { ChangeEventHandler } from 'react'

export interface FieldProps {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: 'text' | 'number'
  min?: string
  step?: string
  /** Id d'une <datalist> pour proposer des suggestions. */
  list?: string
  placeholder?: string
}

export interface FieldUIProps extends Omit<FieldProps, 'onChange'> {
  onChange: ChangeEventHandler<HTMLInputElement>
}
