import { useState } from 'react'
import { useHouse } from '@/lib/useHouse'
import type { TabId } from '@/types'
import AppUI from './UI'
import { DEFAULT_TAB, TABS } from './constants'

/** La WebApp : la clé, puis deux pages (caméras, API). */
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
      tab={tab}
      tabs={TABS}
      onTab={setTab}
      onConnect={house.connect}
      onForget={house.forget}
    />
  )
}

export default App
