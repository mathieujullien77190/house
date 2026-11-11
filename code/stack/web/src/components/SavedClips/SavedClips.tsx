import { useEffect, useState } from 'react'
import { fetchSavedEvents, setClipEmoji, setClipSaved } from '@/lib/api'
import type { EventRow } from '@/types'
import SavedClipsUI from './UI'
import type { SavedClipsProps } from './types'

/** Les clips sauvegardés (jamais effacés), en bas de l'onglet Caméras ; un clic sur une vignette lit le clip. */
const SavedClips = ({ apiKey, onOpenCamera }: SavedClipsProps) => {
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
  // L'emoji d'un clip : l'API le garde, la liste montre ce qu'elle a gardé. Un échec laisse l'ancien.
  const emoji = async (id: string, value: string | null) => {
    const kept = await setClipEmoji(apiKey, id, value)
    /* v8 ignore next */
    setEvents((current) => current?.map((event) => (event.id === id ? { ...event, emoji: kept } : event)) ?? current)
  }
  return (
    <>
      <SavedClipsUI
        apiKey={apiKey}
        events={events}
        failed={failed}
        opened={opened}
        durations={durations}
        saved
        onSave={save}
        saveFailed={failedSave}
        onDuration={(id, seconds) => setDurations((current) => (current[id] === seconds ? current : { ...current, [id]: seconds }))}
        onEmoji={emoji}
        onOpen={(id) => {
          // Un clic sur la vignette d'un clip : le détail de sa caméra s'ouvre sur ce clip, qui se lance (page Caméras) ; sans cela, il se lit sur place.
          const clicked = events?.find((event) => event.id === id)
          if (onOpenCamera && clicked) onOpenCamera(clicked.camera, clicked.id)
          else setOpenId(id)
        }}
        onBack={() => setOpenId('')}
      />
    </>
  )
}

export default SavedClips
