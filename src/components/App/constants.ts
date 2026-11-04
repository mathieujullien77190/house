import type { SegmentedOption } from '@/components/UI/SegmentedControl'
import type { TabId } from './types'

export const TITLE = 'Système domotique'
export const SUBTITLE = 'Caméras, lumières, volets et prises : ce qui est en place et ce qui se prépare.'

export const HINT = 'Glisse un composant pour le déplacer (ou flèches du clavier). Les traits suivent.'

export const LOADING_TEXT = 'Chargement de la vue 3D…'
export const TABS_LABEL = 'Domaines de la maison'
export const DEFAULT_TAB: TabId = 'cameras'
export const TABS: SegmentedOption<TabId>[] = [
  { id: 'cameras', label: 'Caméra' },
  { id: 'lights', label: 'Lumière' },
  { id: 'shutters', label: 'Volet' },
  { id: 'plugs', label: 'Prise' },
  { id: 'architecture', label: 'Architecture' },
]
