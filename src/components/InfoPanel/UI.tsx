import Button from '@/components/UI/Button'
import Field from '@/components/UI/Field'
import RichText from '@/components/UI/RichText'
import Select from '@/components/UI/Select'
import { EMPTY_TEXT, LINKS_EMPTY, LINKS_TITLE, POSITION_LABEL, REMOVE_LINK_LABEL } from './constants'
import type { InfoPanelUIProps } from './types'

const InfoPanelUI = ({
  mode, node, link, linkLabel, linkTypeLabel, linkDescription, linkItems, position, showZone, showPrice, zoneOptions,
  onZoneChange, onPriceChange, onRemoveLink, onSelectLink,
}: InfoPanelUIProps) => {
  if (mode === 'node' && node) {
    return (
      <>
        <h2 className="m-0 text-[1.15rem] font-semibold">{node.title}</h2>
        <p className="mb-3 mt-0.5 text-muted">
          <RichText text={node.sub} />
        </p>
        {showZone && <Select label="Zone" value={node.zone ?? ''} options={zoneOptions} onChange={onZoneChange} />}
        {showPrice && <Field label="Prix (€)" type="number" min="0" step="0.01" value={node.price ?? 0} onChange={onPriceChange} />}

        <p className="mb-0 mt-3 text-xs text-muted">{POSITION_LABEL}</p>
        <p className="m-0 text-[0.95rem] font-semibold">{position}</p>

        <h3 className="mb-1.5 mt-4 text-xs font-normal text-muted">
          {LINKS_TITLE} ({linkItems.length})
        </h3>
        {linkItems.length === 0 && <p className="m-0 text-[0.85rem] text-muted">{LINKS_EMPTY}</p>}
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {linkItems.map((item) => (
            <li key={item.id} className="rounded-lg border border-line bg-bg p-2">
              <button
                type="button"
                className="w-full cursor-pointer border-0 bg-transparent p-0 text-left text-inherit focus-visible:outline-2 focus-visible:outline-camera"
                onClick={() => onSelectLink(item.id)}
              >
                <span className="flex items-center gap-2 text-[0.9rem] font-semibold">
                  <svg width="22" height="8" aria-hidden="true">
                    <line x1="0" y1="4" x2="22" y2="4" className={item.swatchClass} />
                  </svg>
                  {item.otherTitle}
                </span>
              </button>
              <span className="mt-0.5 block text-xs text-muted">
                <RichText text={item.typeLabel} />
                {item.otherFloor && ` · ${item.otherFloor}`}
              </span>
              <span className="mt-0.5 block text-xs">
                <RichText text={item.description} />
              </span>
            </li>
          ))}
        </ul>
      </>
    )
  }

  if (mode === 'link' && link) {
    return (
      <>
        <h2 className="m-0 text-[1.15rem] font-semibold">Lien</h2>
        <p className="mb-0.5 mt-0.5 text-[0.95rem] font-semibold">{linkLabel}</p>
        <p className="m-0 text-xs text-muted">
          <RichText text={linkTypeLabel} />
        </p>
        <p className="mb-0 mt-2 text-[0.85rem]">
          <RichText text={linkDescription} />
        </p>
        <Button variant="danger" className="mt-3" onClick={onRemoveLink}>
          {REMOVE_LINK_LABEL}
        </Button>
      </>
    )
  }

  return <p className="text-muted">{EMPTY_TEXT}</p>
}

export default InfoPanelUI
