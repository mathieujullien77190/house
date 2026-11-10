import { useState } from 'react'
import { fetchSavedEvents } from '@/lib/api'
import { useHouse } from '@/lib/useHouse'
import { useMobile } from '@/lib/useMobile'
import { useReadClips } from '@/lib/useReadClips'
import { useMotionNotifications } from '@/lib/useMotionNotifications'
import type { EventRow, TabId } from '@/types'
import AppUI from './UI'
import { DEFAULT_TAB, TABS } from './constants'

/** La WebApp : la clé, puis deux pages (caméras, API). */
const App = () => {
  const house = useHouse()
  const mobile = useMobile()
  const notify = useMotionNotifications(house.events, house.status === 'ready')
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB)
  // La caméra dont on voit le détail (avec sa frise) ; null : la mosaïque du direct de toutes les caméras.
  const [openCamera, setOpenCamera] = useState<string | null>(null)
  // Le clip à ouvrir avec la caméra (celui de la ligne cliquée dans la mosaïque) et les clips déjà ouverts sur cet appareil.
  const [openEvent, setOpenEvent] = useState<string | undefined>(undefined)
  const read = useReadClips()
  // Le clip demandé quand il est trop ancien pour les événements récents que la page relit (un clip sauvegardé, ouvert depuis son emoji sur la carte) : on le lit avec les clips sauvegardés.
  const [openRow, setOpenRow] = useState<EventRow | null>(null)
  const openCameraWith = (camera: string | null, eventId?: string) => {
    const show = (row: EventRow | null) => {
      setOpenRow(row)
      setOpenEvent(eventId)
      setOpenCamera(camera)
    }
    if (!camera || !eventId || house.events.some((event) => event.id === eventId)) {
      show(null)
      return
    }
    // La carte d'une caméra se monte sur le clip : on attend de l'avoir pour ouvrir la page (sans lui, elle s'ouvrirait en direct).
    fetchSavedEvents(house.key).then(
      (list) => show(list.find((event) => event.id === eventId) ?? null),
      () => show(null),
    )
  }
  const events = openRow && !house.events.some((event) => event.id === openRow.id) ? [...house.events, openRow] : house.events
  return (
    <AppUI
      status={house.status}
      message={house.message}
      apiKey={house.key}
      cameras={house.cameras}
      events={events}
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
    />
  )
}

export default App
