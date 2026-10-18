import type { RefObject } from 'react'
import type { DiagramLink, DiagramNode, Floor } from '@/nodes'
import type { DiagramNodeProps } from '@/components/DiagramNode'

export interface DiagramProps {
  nodes: DiagramNode[]
  links: DiagramLink[]
  /** Étage affiché ; les composants de l'autre étage apparaissent en filigrane. */
  floor: Floor
  selectedNode: string | null
  selectedLink: string | null
  onFloorChange: (floor: Floor) => void
  onSelectNode: (id: string) => void
  /** Clic sans glissement (ou Entrée) sur un composant : ouvre son détail. */
  onActivateNode: (id: string) => void
  onSelectLink: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}

export interface ClusterBox {
  x: number
  y: number
  w: number
  h: number
}

export interface LinkView {
  id: string
  d: string
  className: string
  onSelect: () => void
}

export interface FloorTab {
  id: Floor
  label: string
}

export interface DiagramUIProps {
  svgRef: RefObject<SVGSVGElement | null>
  /** Largeur CSS du schéma pour le zoom actuel. */
  width: string
  zoomLabel: string
  canZoomIn: boolean
  canZoomOut: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  floor: Floor
  floors: FloorTab[]
  onFloorChange: (floor: Floor) => void
  cluster: ClusterBox | null
  links: LinkView[]
  nodes: DiagramNodeProps[]
}
