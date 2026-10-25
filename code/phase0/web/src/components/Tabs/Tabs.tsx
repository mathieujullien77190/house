import TabsUI from './UI'
import { buildItems } from './helpers'
import type { TabsProps } from './types'

const Tabs = <T extends string>({ label, options, value, onChange }: TabsProps<T>) => {
  return <TabsUI label={label} items={buildItems(options, value)} onSelect={onChange} />
}

export default Tabs
