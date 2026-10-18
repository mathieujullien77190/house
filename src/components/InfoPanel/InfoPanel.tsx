import { linkTypeLabel } from '@/linkInfo'
import { isCameraKind } from '@/nodes'
import { locate } from '@/plan'
import InfoPanelUI from './UI'
import { buildLinkItems, linkDescription, linkLabel, panelMode, parsePrice, zoneOptions } from './helpers'
import type { InfoPanelProps } from './types'

const InfoPanel = ({ node, link, nodes, links, onUpdateNode, onSetZone, onRemoveLink, onSelectLink }: InfoPanelProps) => {
  const update = (patch: Parameters<typeof onUpdateNode>[1]) => {
    if (node) onUpdateNode(node.id, patch)
  }

  return (
    <InfoPanelUI
      mode={panelMode(node, link)}
      node={node}
      link={link}
      linkLabel={linkLabel(nodes, link)}
      linkTypeLabel={link ? linkTypeLabel(link.type) : ''}
      linkDescription={linkDescription(nodes, link)}
      linkItems={buildLinkItems(node, links, nodes)}
      position={node ? locate(node) : ''}
      showZone={node !== null && isCameraKind(node.kind)}
      showPrice={node?.kind === 'custom'}
      zoneOptions={zoneOptions(node?.zone)}
      onZoneChange={(zone) => node && onSetZone(node.id, zone)}
      onPriceChange={(raw) => update({ price: parsePrice(raw) })}
      onRemoveLink={() => link && onRemoveLink(link.id)}
      onSelectLink={onSelectLink}
    />
  )
}

export default InfoPanel
