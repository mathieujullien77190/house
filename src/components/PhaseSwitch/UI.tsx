import { GROUP_LABEL } from './constants'
import type { PhaseSwitchUIProps } from './types'

const PhaseSwitchUI = ({ cards, onSelect }: PhaseSwitchUIProps) => {
  return (
    <div className="grid gap-3 min-[900px]:grid-cols-3" role="radiogroup" aria-label={GROUP_LABEL}>
      {cards.map((c) => (
        <button key={c.id} type="button" role="radio" aria-checked={c.active} className={c.className} onClick={() => onSelect(c.id)}>
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">{c.title}</span>
            <span className="text-lg font-bold tabular-nums">{c.total}</span>
          </span>
          <span className="mt-0.5 block text-[0.85rem] text-muted">{c.summary}</span>
          {c.extra && <span className="mt-0.5 block text-xs text-muted">{c.extra}</span>}
        </button>
      ))}
    </div>
  )
}

export default PhaseSwitchUI
