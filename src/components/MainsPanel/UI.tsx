import Card from '@/components/UI/Card'
import { NOTE, TITLE } from './constants'
import type { MainsPanelUIProps } from './types'

const MainsPanelUI = ({ items, outlets, totalWatts }: MainsPanelUIProps) => {
  return (
    <Card as="section" className="h-full">
      <h2 className="m-0 text-[1.15rem] font-semibold">{TITLE}</h2>
      <p className="mb-3 mt-0.5 text-[0.9rem] text-muted">
        {outlets} prise{outlets > 1 ? 's' : ''} nécessaire{outlets > 1 ? 's' : ''} · environ {totalWatts} W au maximum
      </p>
      <ul className="m-0 list-none p-0">
        {items.map((i) => (
          <li key={i.id} className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 text-[0.9rem]">
            <span>
              <strong className="font-semibold">{i.label}</strong>
              {i.detail && <small className="ml-2 text-muted">{i.detail}</small>}
            </span>
            <span className="whitespace-nowrap tabular-nums text-muted">{i.watts === null ? '—' : `${i.watts} W`}</span>
          </li>
        ))}
      </ul>
      <p className="mb-0 mt-3 text-xs text-muted">{NOTE}</p>
    </Card>
  )
}

export default MainsPanelUI
