import { useCallback, useState } from 'react'
import { CameraCard as CameraCardUI, SnapshotImage as ImageBox } from '@house/ui'
import ClipPlayer from '@/components/ClipPlayer'
import SnapshotImage from '@/components/SnapshotImage'
import Timeline from '@/components/Timeline'
import type { EventRow } from '@/types'
import { NO_CLIP_TEXT, NO_IMAGE_TEXT, ONGOING_CLIP_TEXT } from './constants'
import { captionOf, clipLead, lastEventText, liveSrc } from './helpers'
import type { CameraCardProps } from './types'

/**
 * Une caméra : en haut le direct (flux MJPEG relayé par l'API depuis go2rtc), remplacée par l'image gardée
 * à l'instant choisi sur la frise ou par le clip de l'événement choisi ; puis le dernier événement et la frise.
 * La carte elle-même (@house/ui) ne sait rien de tout ça : elle reçoit le média et la frise déjà rendus.
 */
const CameraCard = ({ apiKey, camera, events }: CameraCardProps) => {
  const [cursor, setCursor] = useState<number | null>(null)
  const [selected, setSelected] = useState<EventRow | null>(null)
  const [playhead, setPlayhead] = useState<number | null>(null)
  // L'instant cliqué dans l'événement (secondes absolues) et la durée réelle de sa vidéo, une fois connue.
  const [wanted, setWanted] = useState<number | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)

  const lead = selected ? clipLead(selected, videoDuration) : 0
  // Le clip commence `lead` secondes avant l'événement : l'instant voulu se traduit en secondes de vidéo.
  const clipStart = selected && wanted !== null ? Math.max(0, wanted - selected.started_at + lead) : 0
  const onDuration = useCallback((seconds: number) => setVideoDuration(seconds), [])
  // Le direct : un flux MJPEG que l'API relaie depuis go2rtc ; une seule requête, les images arrivent toutes seules.
  const live = liveSrc(camera.name)

  const back = () => {
    setCursor(null)
    setSelected(null)
    setPlayhead(null)
    setWanted(null)
  }

  // Ce qui est montré en haut, dans l'ordre de priorité : le clip, l'événement en cours, l'image d'un instant, la dernière image.
  const ongoing = selected !== null && selected.ended_at === null
  const media = selected?.clip ? (
    <ClipPlayer
      apiKey={apiKey}
      path={selected.clip}
      startAt={clipStart}
      onClose={back}
      onTime={(seconds) => setPlayhead(selected.started_at - lead + seconds)}
      onDuration={onDuration}
    />
  ) : selected && !ongoing ? (
    <ImageBox src="" message={NO_CLIP_TEXT} />
  ) : cursor !== null && !ongoing ? (
    <SnapshotImage apiKey={apiKey} camera={camera.name} at={cursor} />
  ) : (
    <ImageBox src={live} message={NO_IMAGE_TEXT} />
  )

  return (
    <CameraCardUI
      name={camera.name}
      caption={captionOf(cursor, selected)}
      warning={ongoing ? ONGOING_CLIP_TEXT : ''}
      media={media}
      lastEventText={lastEventText(events)}
      timeline={
        <Timeline
          apiKey={apiKey}
          camera={camera.name}
          events={events}
          playhead={playhead}
          onCursor={setCursor}
          onEvent={(event, at) => {
            setSelected(event)
            setWanted(at)
            setPlayhead(at)
            setVideoDuration(null)
          }}
        />
      }
    />
  )
}

export default CameraCard
