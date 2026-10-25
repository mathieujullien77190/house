import { GROUP_CLASS } from './constants'
import type { TabsUIProps } from './types'

const TabsUI = <T extends string>({ label, items, onSelect }: TabsUIProps<T>) => {
  return (
    <div className={GROUP_CLASS} role="tablist" aria-label={label}>
      {items.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={item.active} className={item.className} onClick={() => onSelect(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default TabsUI
