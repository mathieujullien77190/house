import { buildLines, countKind, euro, warnings, type Counts } from '@/catalog'
import PricingUI from './UI'
import { buildSections, portsLabel, sum } from './helpers'
import type { PricingProps } from './types'

const Pricing = ({ phase, counts, customs, onAdd, onRemove, onReset }: PricingProps) => {
  const lines = buildLines(counts, customs, phase)

  const handleQuantityChange = (key: keyof Counts, value: number) => {
    // On compare à la quantité affichée, qui peut inclure des unités hors compteur.
    const current = lines.find((l) => l.editable === key)?.qty ?? counts[key]
    if (value > current) onAdd(countKind[key])
    else onRemove(countKind[key])
  }

  return (
    <PricingUI
      sections={buildSections(lines)}
      total={euro(sum(lines))}
      estimated={euro(sum(lines.filter((l) => l.source === 'estimation')))}
      ports={portsLabel(counts, phase)}
      warnings={warnings(counts, phase)}
      onQuantityChange={handleQuantityChange}
      onReset={onReset}
    />
  )
}

export default Pricing
