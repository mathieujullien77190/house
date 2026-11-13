import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'default' | 'active' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Apparence du bouton ; `active` sert aux boutons à bascule (aria-pressed). */
  variant?: ButtonVariant
}

export type ButtonUIProps = ButtonHTMLAttributes<HTMLButtonElement>
