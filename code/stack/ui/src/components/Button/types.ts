import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'default' | 'active' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Apparence : `active` pour un état choisi, `danger` pour une action qui retire. */
  variant?: ButtonVariant
}
