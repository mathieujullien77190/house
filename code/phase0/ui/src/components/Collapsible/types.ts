import type { ReactNode } from 'react'

export interface CollapsibleProps {
  title: string
  /** Un détail en petit à côté du titre (chemin, nombre…). */
  detail?: string
  /** Ouvert au départ ; le visiteur l'ouvre et le ferme ensuite (le navigateur retient l'état). */
  defaultOpen?: boolean
  children: ReactNode
}
