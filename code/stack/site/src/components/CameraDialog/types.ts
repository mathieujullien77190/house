import type { SegmentedOption } from '@/components/UI/SegmentedControl'
import type { DiagramNode } from '@/nodes'
import type { ReactNode } from 'react'

export type DialogView = '2d' | '3d'

export interface CameraDialogProps {
  /** Caméra cliquée dans le schéma (null quand aucune). */
  node: DiagramNode | null
  open: boolean
  onClose: () => void
}

export interface CameraDialogUIProps {
  open: boolean
  title: string
  view: DialogView
  tabs: SegmentedOption<DialogView>[]
  onViewChange: (view: DialogView) => void
  onClose: () => void
  schematic: ReactNode
  model: ReactNode
}
