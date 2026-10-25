import { useCallback, useEffect, useState } from 'react'
import type { EventRow } from '@/types'
import CameraCardUI from './UI'
import { IMAGE_ERROR_TEXT, IMAGE_REFRESH_MS } from './constants'
import { captionOf, clipLead, imageSrc, lastEventText } from './helpers'
import type { CameraCardProps } from './types'

/**
 * Une caméra : en haut sa dernière image (rechargée à intervalle régulier depuis Frigate), remplacée par
 * l'image gardée à l'instant choisi sur la frise ou par le clip de l'événement choisi ; puis le dernier
 * événement et la frise.
 */
const CameraCard = ({ apiKey, camera, events }: CameraCardProps) => {
  const [tick, setTick] = useState(() => Date.now())
  const [cursor, setCursor] = useState<number | null>(null)
  const [selected, setSelected] = useState<EventRow | null>(null)
  const [playhead, setPlayhead] = useState<number | null>(null)
  // L'instant cliqué dans l'événement (secondes absolues) et la durée réelle de sa vidéo, une fois connue.
  const [wanted, setWanted] = useState<number | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), IMAGE_REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  const lead = selected ? clipLead(selected, videoDuration) : 0
  // Le clip commence `lead` secondes avant l'événement : l'instant voulu se traduit en secondes de vidéo.
  const clipStart = selected && wanted !== null ? Math.max(0, wanted - selected.started_at + lead) : 0

  const onDuration = useCallback((seconds: number) => setVideoDuration(seconds), [])

  return (
    <CameraCardUI
      apiKey={apiKey}
      name={camera.name}
      imageSrc={imageSrc(camera.imageUrl, tick)}
      cursor={cursor}
      selected={selected}
      caption={captionOf(cursor, selected)}
      lastEventText={lastEventText(events)}
      events={events}
      playhead={playhead}
      clipStart={clipStart}
      onCursor={setCursor}
      onEvent={(event, at) => {
        setSelected(event)
        setWanted(at)
        setPlayhead(at)
        setVideoDuration(null)
      }}
      onClipTime={(seconds) => {
        if (selected) setPlayhead(selected.started_at - lead + seconds)
      }}
      onClipDuration={onDuration}
      onBack={() => {
        setCursor(null)
        setSelected(null)
        setPlayhead(null)
        setWanted(null)
      }}
      onImageError={() => console.warn(IMAGE_ERROR_TEXT)}
    />
  )
}

export default CameraCard
