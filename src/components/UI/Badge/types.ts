import type { ReactNode } from 'react'

export type BadgeTone = 'repo' | 'estimation' | 'perso'

export interface BadgeProps {
  tone: BadgeTone
  children: ReactNode
}

export interface BadgeUIProps {
  className: string
  children: ReactNode
}
