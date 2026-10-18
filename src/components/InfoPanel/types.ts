import type { DiagramLink, DiagramNode, LinkType } from '@/nodes'
import type { SelectOption } from '@/components/UI/Select'

export interface InfoPanelProps {
  node: DiagramNode | null
  link: DiagramLink | null
  nodes: DiagramNode[]
  links: DiagramLink[]
  onUpdateNode: (id: string, patch: Partial<DiagramNode>) => void
  /** Change la zone d'une caméra et la rebranche selon la règle des zones. */
  onSetZone: (id: string, zone: string) => void
  onRemoveLink: (id: string) => void
  onSelectLink: (id: string) => void
}

export type InfoPanelMode = 'node' | 'link' | 'empty'

/** Une liaison du composant sélectionné, prête à afficher. */
export interface LinkItem {
  id: string
  /** Nom du composant à l'autre bout. */
  otherTitle: string
  /** Étage de l'autre bout s'il diffère de celui du composant sélectionné. */
  otherFloor?: string
  type: LinkType
  typeLabel: string
  description: string
  /** Classes du trait d'exemple. */
  swatchClass: string
}

export interface InfoPanelUIProps {
  mode: InfoPanelMode
  node: DiagramNode | null
  link: DiagramLink | null
  /** « Origine ↔ Destination » de la liaison sélectionnée. */
  linkLabel: string
  linkTypeLabel: string
  linkDescription: string
  linkItems: LinkItem[]
  /** Où se trouve le composant sélectionné (pièce et étage). */
  position: string
  showZone: boolean
  showPrice: boolean
  zoneOptions: SelectOption[]
  onZoneChange: (value: string) => void
  onPriceChange: (value: string) => void
  onRemoveLink: () => void
  onSelectLink: (id: string) => void
}
