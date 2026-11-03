import { useState } from 'react'
import { useHouse } from '@/lib/useHouse'
import type { TabId } from '@/types'
import { useLampCount } from '@/components/Lights'
import AppUI from './UI'
import { DEFAULT_TAB, TABS } from './constants'

/** La WebApp : la clé, puis deux pages (caméras, API). */
const App = () => {
  const house = useHouse()
  const lampCount = useLampCount(house.key, house.status === 'ready')
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB)
  // La caméra dont on voit le détail (avec sa frise) ; null : la mosaïque du direct de toutes les caméras.
  const [openCamera, setOpenCamera] = useState<string | null>(null)
  return (
    <AppUI
      status={house.status}
      message={house.message}
      apiKey={house.key}
      cameras={house.cameras}
      events={house.events}
      lampCount={lampCount}
      tab={tab}
      openCamera={openCamera}
      onOpenCamera={setOpenCamera}
      tabs={TABS}
      onTab={setTab}
      onConnect={house.connect}
      onForget={house.forget}
    />
  )
}

export default App
