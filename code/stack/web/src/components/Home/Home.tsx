import { useEffect, useState } from 'react'
import GuestLink from '@/components/GuestLink'
import { fetchSavedEvents, setClipNote, setClipSaved } from '@/lib/api'
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
  // « Non sauvegardé » libère le clip (il sera effacé comme les autres après la durée de garde) : il quitte la liste des clips sauvegardés et on revient à elle. Un échec le laisse ouvert et sauvegardé.
  const [failedSave, setFailedSave] = useState(false)
  const save = (next: boolean) => {
    if (!opened || next) return
    const id = opened.id
    setFailedSave(false)
    setClipSaved(apiKey, id, false).then(
      () => {
        // Un clip n'est ouvert que si la liste est lue : `current` n'est jamais null ici (garde pour TypeScript).
        /* v8 ignore next */
        setEvents((current) => current?.filter((event) => event.id !== id) ?? current)
        setOpenId('')
      },
      () => setFailedSave(true),
    )
  }
  // La note d'un clip : l'API la garde (sans espaces autour), la liste montre ce qu'elle a gardé. Un échec laisse l'ancienne note.
  const note = async (id: string, text: string) => {
    const kept = await setClipNote(apiKey, id, text)
    // Même garde que ci-dessus : la liste est lue quand une note se pose.
    /* v8 ignore next */
    setEvents((current) => current?.map((event) => (event.id === id ? { ...event, note: kept } : event)) ?? current)
  }
  // Le lien de la page invité se montre en haut de la liste, pas pendant la lecture d'un clip.
  return (
    <>
      {opened ? null : <GuestLink apiKey={apiKey} />}
      <HomeUI
        apiKey={apiKey}
        events={events}
        failed={failed}
        opened={opened}
        durations={durations}
        saved
        onSave={save}
        saveFailed={failedSave}
        onDuration={(id, seconds) => setDurations((current) => (current[id] === seconds ? current : { ...current, [id]: seconds }))}
        onNote={note}
        onOpen={setOpenId}
        onBack={() => setOpenId('')}
      />
    </>
  )
}

export default Home
