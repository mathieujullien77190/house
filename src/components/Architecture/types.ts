import type { ReactNode } from 'react'
import type { ArchView } from '@/components/ArchDiagram'

export type DiagramViewId = 'hardware' | 'software'
export type ViewId = DiagramViewId | 'interfaces' | 'code' | 'deploy'

/** Le système : le titre, les deux schémas et l'introduction des vues sans schéma. */
export interface ArchitectureConfig {
  title: string
  views: Record<DiagramViewId, ArchView>
  intros: Record<Exclude<ViewId, DiagramViewId>, string[]>
}

export interface ArchitectureUIProps {
  title: string
  viewId: ViewId
  /** Absent dans les vues interfaces, code et déploiement. */
  view: ArchView | null
  /** Paragraphes sous le titre, selon la vue. */
  intro: string[]
  options: { id: ViewId; label: string }[]
  onViewChange: (id: ViewId) => void
  /** Contenu des vues sans schéma SVG de ce composant : les interfaces, le navigateur de fichiers (code) ou le tableau des adresses (déploiement). */
  children?: ReactNode
}
