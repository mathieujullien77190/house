import type { ReactNode } from 'react'

export interface IndicatorHintProps {
  /** Ce que dit l'infobulle : ce que l'indicateur montre. */
  text: string
  /** L'indicateur lui-même. */
  children: ReactNode
}
