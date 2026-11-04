import { useCallback, useState } from 'react'
import { CameraCard as CameraCardUI, SnapshotImage as ImageBox, SpecList, Tabs } from '@house/ui'
import ClipPlayer from '@/components/ClipPlayer'
import { ZONES } from '@/components/Lights/constants'
import PowerButton from '@/components/PowerButton'
import { liveSrc } from '@/lib/live'
import { useBigView } from '@/lib/useBigView'
import { usePinchZoom } from '@/lib/usePinchZoom'
import { useSensors } from '@/lib/useSensors'
import { usePower } from '@/lib/usePower'
import SnapshotImage from '@/components/SnapshotImage'
import Timeline from '@/components/Timeline'
import type { EventRow } from '@/types'
import {
  CAMERA_OFF_TEXT,
  CAMERA_STARTING_TEXT,
  CAMERA_TITLE_PREFIX,
  HIDDEN_PLAYER_CLASS,
  LIVE_QUALITY_LABEL,
  LIVE_QUALITY_OPTIONS,
  NO_CLIP_TEXT,
  NO_IMAGE_TEXT,
  ONGOING_CLIP_TEXT,
  QUALITY_LABEL,
  QUALITY_OPTIONS,
  TEMPERATURE_CAMERA,
} from './constants'
import { captionOf, clipLead, clipPathOf, liveCaption, temperatureItems } from './helpers'
import type { CameraCardProps, LiveQuality, Quality } from './types'

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
  // La version du clip à lire (la légère par défaut : tous les appareils la lisent) et d'où la reprendre quand on en change.
  const [quality, setQuality] = useState<Quality>('h264')
  const [resumeAt, setResumeAt] = useState(0)
  // La résolution réelle du direct, lue dans l'image du navigateur à la première image reçue.
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null)
  // Le direct léger par défaut ; le 4K est recodé en MJPEG par le mini PC, donc seulement sur demande.
  const [liveQuality, setLiveQuality] = useState<LiveQuality>('light')
  // Le clip dont la vidéo est téléchargée : tant que ce n'est pas celui de l'événement choisi, on garde l'image.
  const [readyClip, setReadyClip] = useState('')
  // L'alimentation lue sur le switch : coupée, le direct laisse place à une image noire.
  const { power, setPower } = usePower(apiKey, camera.name)
  // « Afficher en grand » : le média en plein écran, en paysage.
  const bigView = useBigView()
  // Le zoom au doigt de la vue en grand (pincer, déplacer, double toucher).
  const pinchZoom = usePinchZoom(bigView.big)
  // La température des deux capteurs de la volière, sous le média de la caméra du portail.
  const showTemperatures = camera.name === TEMPERATURE_CAMERA
  const sensors = useSensors(apiKey, showTemperatures)
  const temperatures = showTemperatures ? temperatureItems(sensors, ZONES.find((zone) => zone.id === 'voliere')?.sensors ?? []) : []
  const off = power !== null && !power.on
  // Courant mis mais flux pas encore reçu : la caméra démarre (environ une minute), le direct reviendra tout seul.
  const starting = power !== null && power.on && !power.streaming
  const placeholder = off ? CAMERA_OFF_TEXT : starting ? CAMERA_STARTING_TEXT : ''

  const lead = selected ? clipLead(selected, videoDuration) : 0
  // Ce que la vidéo couvre sur la frise : elle commence `lead` avant l'événement et dure `videoDuration`.
  const clipRange = selected?.clip && videoDuration !== null ? { start: selected.started_at - lead, end: selected.started_at - lead + videoDuration } : null
  const clipPath = selected ? clipPathOf(selected, quality) : null
  const onReady = useCallback(() => setReadyClip(clipPath ?? ''), [clipPath])
  const onDuration = useCallback((seconds: number) => setVideoDuration(seconds), [])
  // Le direct : un flux MJPEG que l'API relaie depuis go2rtc ; une seule requête, les images arrivent toutes seules.
  const live = liveSrc(camera.name, liveQuality === 'hd')

  // Changer de direct : la résolution lue à la première image n'est plus valable.
  const changeLiveQuality = (next: LiveQuality) => {
    if (next === liveQuality) return
    setLiveSize(null)
    setLiveQuality(next)
  }

  // Changer de version reprend la lecture là où elle en est.
  const changeQuality = (next: Quality) => {
    if (next === quality) return
    setResumeAt(playhead !== null && selected ? Math.max(0, playhead - (selected.started_at - lead)) : 0)
    setQuality(next)
  }

  const back = () => {
    setCursor(null)
    setSelected(null)
    setPlayhead(null)
  }

  // Ce qui est montré en haut, dans l'ordre de priorité : le clip, l'événement en cours, l'image d'un instant, la dernière image.
  const ongoing = selected !== null && selected.ended_at === null
  const clipReady = clipPath !== null && clipPath === readyClip
  // Un événement choisi dont la vidéo n'est pas encore là (en cours, ou fini mais pas encore copié) : un cadre noir et ce qu'on attend.
  const pendingText = selected && !selected.clip ? (ongoing ? ONGOING_CLIP_TEXT : NO_CLIP_TEXT) : ''
  const still = pendingText ? (
    <ImageBox src="" message={pendingText} />
  ) : cursor !== null ? (
    <SnapshotImage apiKey={apiKey} camera={camera.name} at={cursor} />
  ) : (
    <ImageBox src={placeholder ? '' : live} message={placeholder || NO_IMAGE_TEXT} onSize={(width, height) => setLiveSize({ width, height })} />
  )
  // Le lecteur se monte dès le choix (il télécharge le clip) mais reste caché : l'image reste en place jusqu'à ce que la vidéo soit là.
  const media = (
    <>
      {selected && clipPath ? (
        <div className={clipReady ? undefined : HIDDEN_PLAYER_CLASS}>
          <ClipPlayer
            key={clipPath}
            apiKey={apiKey}
            path={clipPath}
            startAt={resumeAt}
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
      caption={captionOf(cursor, selected, liveCaption(placeholder ? null : liveSize))}
      actions={
        <>
          {selected?.clip_h264 ? <Tabs label={QUALITY_LABEL} options={[...QUALITY_OPTIONS]} value={quality} onChange={changeQuality} /> : null}
          {selected || cursor !== null ? null : <Tabs label={LIVE_QUALITY_LABEL} options={[...LIVE_QUALITY_OPTIONS]} value={liveQuality} onChange={changeLiveQuality} />}
          <PowerButton apiKey={apiKey} camera={camera.name} power={power} onPower={setPower} />
        </>
      }
      media={media}
      figureRef={bigView.ref}
      expanded={bigView.big}
      onExpand={bigView.open}
      onCollapse={bigView.close}
      mediaGesture={pinchZoom}
      details={temperatures.length > 0 ? <SpecList items={temperatures} /> : undefined}
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
            setResumeAt(0)
            setPlayhead(at)
            setVideoDuration(null)
          }}
        />
      }
    />
  )
}

export default CameraCard
