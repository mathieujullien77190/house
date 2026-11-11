import { GROUP_CLASS } from './constants'
import { tabClass } from './helpers'
import type { TabsProps } from './types'

/** Une barre d'onglets (rôles tablist et tab) ; l'état est au parent. */
const Tabs = <T extends string>({ label, options, value, onChange, compact = false, tiny = false }: TabsProps<T>) => {
  return (
    <div className={GROUP_CLASS} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={option.id === value}
          className={tabClass(option.id === value, compact, tiny)}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs
