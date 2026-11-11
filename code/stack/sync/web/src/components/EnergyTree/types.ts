import type { EnergyNode } from '@/types'

export interface EnergyTreeProps {
  /** Le nœud à dessiner (la racine au premier appel) ; ses enfants le sont dessous, repliables. */
  node: EnergyNode
  /** Le niveau du nœud : 0 pour la racine (titre de section), plus bas titres serrés. */
  depth?: number
}
