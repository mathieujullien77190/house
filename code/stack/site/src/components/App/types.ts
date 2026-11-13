import type { ReactNode } from 'react'
import type { SegmentedOption } from '@/components/UI/SegmentedControl'
import type { DomainId } from '@/domotics'

/** Les onglets de la page : les quatre domaines de la maison, puis l'architecture du système. */
export type TabId = DomainId | 'architecture'

export interface AppUIProps {
  title: string
  subtitle: string
  tabs: SegmentedOption<TabId>[]
  tab: TabId
  onTab: (id: TabId) => void
  /** L'état du domaine de l'onglet ouvert : ce qui est en place et en préparation (absent sur Architecture). */
  domain: ReactNode
  /** Sous ce bloc, un détail propre au domaine (par exemple le schéma 3D du montage des volets). */
  detail?: ReactNode
  /** Explication du dernier branchement automatique (absente si aucun). */
  notice?: string
  hint: string
  /** Onglet Caméra : le plan de la maison et son schéma. */
  diagram: ReactNode
  legend: ReactNode
  info: ReactNode
  /** Onglet Architecture : vues matériel, logiciel, interfaces, code et déploiement. */
  architecture: ReactNode
  /** Onglet Caméra : panneau secteur 230 V. */
  mains: ReactNode
  /** Onglet Caméra : le tableau des prix. */
  pricing: ReactNode
  /** Bloc de définition qui monte depuis le bas. */
  sheet: ReactNode
}
