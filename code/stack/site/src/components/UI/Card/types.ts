import type { ReactNode } from 'react'

export type CardTag = 'section' | 'aside' | 'div'

export interface CardProps {
  /** Balise HTML utilisée (sémantique). */
  as?: CardTag
  className?: string
  children: ReactNode
}

export interface CardUIProps {
  as: CardTag
  className: string
  children: ReactNode
}
