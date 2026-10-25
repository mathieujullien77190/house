import { useCallback, useState } from 'react'
import { CameraCard as CameraCardUI, SnapshotImage as ImageBox } from '@house/ui'
import ClipPlayer from '@/components/ClipPlayer'
import PowerButton from '@/components/PowerButton'
import { liveSrc } from '@/lib/live'
import { usePower } from '@/lib/usePower'
import SnapshotImage from '@/components/SnapshotImage'
import Timeline from '@/components/Timeline'
import type { EventRow } from '@/types'
import { CAMERA_OFF_TEXT, CAMERA_STARTING_TEXT, CAMERA_TITLE_PREFIX, NO_CLIP_TEXT, NO_IMAGE_TEXT, ONGOING_CLIP_TEXT } from './constants'
import { captionOf, clipLead } from './helpers'
import type { CameraCardProps } from './types'

/**
 * Une caméra : en haut le direct (flux MJPEG relayé par l'API depuis go2rtc), remplacée par l'image gardée
 * à l'instant choisi sur la frise ou par le clip de l'événement choisi ; puis la frise.
 * La carte elle-même (@house/ui) ne sait rien de tout ça : elle reçoit le média et la frise déjà rendus.
 */
const CameraCard = ({ apiKey, camera, events }: CameraCardProps) => {
  const [cursor, setCursor] = useState<number | null>(null)
  // L'événement cliqué ; sa version à jour (clip copié, fin du mouvement) vient de la liste relue chaque seconde.
  const [picked, setSelected] = useState<EventRow | null>(null)
  const selected = picked ? (events.find((event) => event.id === picked.id) ?? picked) : null
  const [playhead, setPlayhead] = useState<number | null>(null)
  // La durée réelle de la vidéo, une fois connue.
  // Compte les clics sur un événement : chaque clic relance le clip depuis son début.
  const [plays, setPlays] = useState(0)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  // Le clip dont la vidéo est téléchargée : tant que ce n'est pas celui de l'événement choisi, on garde l'image.
  const [readyClip, setReadyClip] = useState('')
  // L'alimentation lue sur le switch : coupée, le direct laisse place à une image noire.
  const { power, setPower } = usePower(apiKey, camera.name)
  const off = power !== null && !power.on
  // Courant mis mais flux pas encore reçu : la caméra démarre (environ une minute), le direct reviendra tout seul.
  const starting = power !== null && power.on && !power.streaming
  const placeholder = off ? CAMERA_OFF_TEXT : starting ? CAMERA_STARTING_TEXT : ''

  const lead = selected ? clipLead(selected, videoDuration) : 0
  // Ce que la vidéo couvre sur la frise : elle commence `lead` avant l'événement et dure `videoDuration`.
  const clipRange = selected?.clip && videoDuration !== null ? { start: selected.started_at - lead, end: selected.started_at - lead + videoDuration } : null
  const onReady = useCallback(() => setReadyClip(selected?.clip ?? ''), [selected])
  const onDuration = useCallback((seconds: number) => setVideoDuration(seconds), [])
  // Le direct : un flux MJPEG que l'API relaie depuis go2rtc ; une seule requête, les images arrivent toutes seules.
  const live = liveSrc(camera.name)

  const back = () => {
    setCursor(null)
    setSelected(null)
    setPlayhead(null)
  }

  // Ce qui est montré en haut, dans l'ordre de priorité : le clip, l'événement en cours, l'image d'un instant, la dernière image.
  const ongoing = selected !== null && selected.ended_at === null
  const clipReady = selected?.clip != null && selected.clip === readyClip
  // Un événement choisi dont la vidéo n'est pas encore là (en cours, ou fini mais pas encore copié) : un cadre noir et ce qu'on attend.
  const pendingText = selected && !selected.clip ? (ongoing ? ONGOING_CLIP_TEXT : NO_CLIP_TEXT) : ''
  const still = pendingText ? (
    <ImageBox src="" message={pendingText} />
  ) : cursor !== null ? (
    <SnapshotImage apiKey={apiKey} camera={camera.name} at={cursor} />
  ) : (
    <ImageBox src={placeholder ? '' : live} message={placeholder || NO_IMAGE_TEXT} />
  )
  // Le lecteur se monte dès le choix (il télécharge le clip) mais reste caché : l'image reste en place jusqu'à ce que la vidéo soit là.
  const media = (
    <>
      {selected?.clip ? (
        <div hidden={!clipReady}>
          <ClipPlayer
            key={selected.clip}
            apiKey={apiKey}
            path={selected.clip}
            startAt={0}
            restart={plays}
            onClose={back}
            onReady={onReady}
            onTime={(seconds) => setPlayhead(selected.started_at - lead + seconds)}
            onDuration={onDuration}
          />
        </div>
      ) : null}
      {clipReady ? null : still}
    </>
  )

  return (
    <CameraCardUI
      name={`${CAMERA_TITLE_PREFIX}${camera.name}`}
      caption={captionOf(cursor, selected)}
      actions={<PowerButton apiKey={apiKey} camera={camera.name} power={power} onPower={setPower} />}
      media={media}
      timeline={
        <Timeline
          apiKey={apiKey}
          camera={camera.name}
          events={events}
          playhead={playhead}
          clipRange={clipRange}
          onCursor={setCursor}
          onEvent={(event, at) => {
            setSelected(event)
            setPlays((count) => count + 1)
            setPlayhead(at)
            setVideoDuration(null)
          }}
        />
      }
    />
  )
}

export default CameraCard
