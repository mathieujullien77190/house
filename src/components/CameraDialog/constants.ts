import type { SegmentedOption } from '@/components/UI/SegmentedControl'
import type { DialogView } from './types'

export const TABS: SegmentedOption<DialogView>[] = [
  { id: '2d', label: 'Schéma 2D' },
  { id: '3d', label: 'Vue 3D' },
]

export const TABS_LABEL = 'Affichage de la caméra'
export const LOADING_TEXT = 'Chargement de la vue 3D…'
