import { useState } from 'react'
import { useHouse } from '@/lib/useHouse'
import { useMobile } from '@/lib/useMobile'
import { usePlugCount } from '@/lib/usePlugCount'
import { useReadClips } from '@/lib/useReadClips'
import { useMotionNotifications } from '@/lib/useMotionNotifications'
import type { TabId } from '@/types'
import { useLampCount } from '@/components/Lights'
import AppUI from './UI'
import { DEFAULT_TAB, TABS } from './constants'

/** La WebApp : la clé, puis deux pages (caméras, API). */
const App = () => {
  const house = useHouse()
  const lampCount = useLampCount(house.key, house.status === 'ready')
  const plugCount = usePlugCount(house.key, house.status === 'ready')
  const mobile = useMobile()
  const notify = useMotionNotifications(house.events, house.status === 'ready')
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB)
  // La caméra dont on voit le détail (avec sa frise) ; null : la mosaïque du direct de toutes les caméras.
  const [openCamera, setOpenCamera] = useState<string | null>(null)
  // Le clip à ouvrir avec la caméra (celui de la ligne cliquée dans la mosaïque) et les clips déjà ouverts sur cet appareil.
  const [openEvent, setOpenEvent] = useState<string | undefined>(undefined)
  const read = useReadClips()
  const openCameraWith = (camera: string | null, eventId?: string) => {
    setOpenEvent(eventId)
    setOpenCamera(camera)
  }
  return (
    <AppUI
      status={house.status}
      message={house.message}
      apiKey={house.key}
      cameras={house.cameras}
      events={house.events}
      lampCount={lampCount}
      plugCount={plugCount}
      mobile={mobile}
      notify={notify.state}
      onNotify={notify.toggle}
      tab={tab}
      openCamera={openCamera}
      openEvent={openEvent}
      isRead={read.isRead}
      onRead={read.markRead}
      onOpenCamera={openCameraWith}
      tabs={TABS}
      onTab={setTab}
      onConnect={house.connect}
      onForget={house.forget}
    />
  )
}

export default App
