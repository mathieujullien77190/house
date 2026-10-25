import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'default' | 'active' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export type ButtonUIProps = ButtonHTMLAttributes<HTMLButtonElement>
