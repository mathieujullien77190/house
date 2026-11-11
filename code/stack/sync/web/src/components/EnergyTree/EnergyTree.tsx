import { Collapsible } from '@house/ui'
import { energyFigures } from '@/lib/energyTree'
import { CHILDREN_CLASS, FIGURES_CLASS, LEAF_CLASS } from './constants'
import type { EnergyTreeProps } from './types'

/** La consommation en arbre : chaque nœud montre puissance, énergie et coût (pour un groupe, la somme de ses enfants) ; un groupe se replie (tous fermés au départ, la racine aussi), une feuille est une ligne. */
const EnergyTree = ({ node, depth = 0 }: EnergyTreeProps) => {
  if (node.children.length === 0) {
    return (
      <div className={LEAF_CLASS}>
        <span>{node.label}</span>
        <span className={FIGURES_CLASS}>{energyFigures(node)}</span>
      </div>
    )
  }
  return (
    <Collapsible title={node.label} detail={energyFigures(node)} compact={depth > 0} defaultOpen={false}>
      <div className={depth > 0 ? CHILDREN_CLASS : undefined}>
        {node.children.map((child) => (
          <EnergyTree key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    </Collapsible>
  )
}

export default EnergyTree
