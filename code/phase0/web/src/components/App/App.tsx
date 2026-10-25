import { useState } from 'react'
import { originOf } from '@/lib/format'
import { useHouse } from '@/lib/useHouse'
import type { TabId } from '@/types'
import AppUI from './UI'
import { DEFAULT_TAB, TABS } from './constants'

/** La WebApp : la clé, puis trois pages (caméras, API, Frigate). */
const App = () => {
  const house = useHouse()
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB)
  return (
    <AppUI
      status={house.status}
      message={house.message}
      apiKey={house.key}
      cameras={house.cameras}
      events={house.events}
      frigateOrigin={originOf(house.cameras[0]?.liveUrl ?? null)}
      tab={tab}
      tabs={TABS}
      onTab={setTab}
      onConnect={house.connect}
      onForget={house.forget}
    />
  )
}

export default App
