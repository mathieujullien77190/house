import type { KeyboardEvent, PointerEvent } from 'react'
import type { DiagramNode as DiagramNodeModel } from '@/nodes'

export interface DiagramNodeProps {
  n: DiagramNodeModel
  selected: boolean
  /** Composant branché au secteur : affiche le badge éclair. */
  mains: boolean
  /** Composant d'un autre étage : affiché en filigrane, sans interaction. */
  ghost: boolean
  onPointerDown: (e: PointerEvent<SVGGElement>, n: DiagramNodeModel) => void
  onPointerMove: (e: PointerEvent<SVGGElement>) => void
  onPointerUp: () => void
  onKeyDown: (e: KeyboardEvent<SVGGElement>, n: DiagramNodeModel) => void
}

export interface DiagramNodeUIProps {
  n: DiagramNodeModel
  mains: boolean
  ghost: boolean
  groupClass: string
  rectClass: string
  ariaLabel: string
  onPointerDown: (e: PointerEvent<SVGGElement>) => void
  onPointerMove: (e: PointerEvent<SVGGElement>) => void
  onPointerUp: () => void
  onKeyDown: (e: KeyboardEvent<SVGGElement>) => void
}
