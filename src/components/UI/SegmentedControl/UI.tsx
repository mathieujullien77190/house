import { GROUP_CLASS } from './constants'
import type { SegmentedControlUIProps } from './types'

const SegmentedControlUI = <T extends string>({ label, items, onSelect }: SegmentedControlUIProps<T>) => {
  return (
    <div className={GROUP_CLASS} role="radiogroup" aria-label={label}>
      {items.map((item) => (
        <button key={item.id} type="button" role="radio" aria-checked={item.active} className={item.className} onClick={() => onSelect(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default SegmentedControlUI
