import MainsPanelUI from './UI'
import { buildItems, totalWatts } from './helpers'
import type { MainsPanelProps } from './types'

const MainsPanel = ({ nodes }: MainsPanelProps) => {
  const items = buildItems(nodes)
  return <MainsPanelUI items={items} outlets={items.length} totalWatts={totalWatts(items)} />
}

export default MainsPanel
