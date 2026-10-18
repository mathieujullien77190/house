import SegmentedControlUI from './UI'
import { buildItems } from './helpers'
import type { SegmentedControlProps } from './types'

const SegmentedControl = <T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) => {
  return <SegmentedControlUI label={label} items={buildItems(options, value)} onSelect={onChange} />
}

export default SegmentedControl
