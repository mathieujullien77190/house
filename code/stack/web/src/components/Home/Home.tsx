import { useEffect, useState } from 'react'
import GuestLink from '@/components/GuestLink'
import { fetchSavedEvents } from '@/lib/api'
import type { EventRow } from '@/types'
import HomeUI from './UI'
import type { HomeProps } from './types'

/** L'accueil : pour le moment, les clips sauvegardés (jamais effacés) ; un clic sur une vignette lit le clip. */
const Home = ({ apiKey }: HomeProps) => {
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [openId, setOpenId] = useState('')
  // La durée réelle de chaque clip, lue dans sa vidéo.
  const [durations, setDurations] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    fetchSavedEvents(apiKey)
      .then((list) => {
        if (cancelled) return
        setEvents(list)
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [apiKey])

  const opened = events?.find((event) => event.id === openId) ?? null
  // Le lien de la page invité se montre en haut de la liste, pas pendant la lecture d'un clip.
  return (
    <>
      {opened ? null : <GuestLink apiKey={apiKey} />}
      <HomeUI apiKey={apiKey} events={events} failed={failed} opened={opened} durations={durations} onDuration={(id, seconds) => setDurations((current) => (current[id] === seconds ? current : { ...current, [id]: seconds }))} onOpen={setOpenId} onBack={() => setOpenId('')} />
    </>
  )
}

export default Home
