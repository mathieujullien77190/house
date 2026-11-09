import { CameraTile, SnapshotImage as ImageBox } from '@house/ui'
import RotatedMedia from '@/components/RotatedMedia'
import { CAMERA_LAMP, CAMERA_SENSOR, CAMERA_WITH_PLUG } from '@/components/CameraCard/constants'
import CameraIndicators from '@/components/CameraIndicators'
import { temperatureItems } from '@/components/CameraCard/helpers'
import { liveSrc } from '@/lib/live'
import { useMobile } from '@/lib/useMobile'
import { useLamp } from '@/lib/useLamp'
import { usePlug } from '@/lib/usePlug'
import { useSensors } from '@/lib/useSensors'
import { usePower } from '@/lib/usePower'
import { formatTime } from '@/lib/format'
import { useClipDuration } from '@/lib/useClipDuration'
import {
  CAPTION_OFF,
  CAPTION_STARTING,
  EVENT_TEXT_CLASS,
  LAST_EVENT_PREFIX,
  NAME_PREFIX,
  NO_EVENT_TEXT,
  READ_CLASS,
  READ_TEXT,
  UNREAD_CLASS,
  UNREAD_TEXT,
  NO_IMAGE_TEXT,
  OFF_TEXT,
  STARTING_TEXT,
} from './constants'
import type { LiveTileProps } from './types'

/**
 * La vignette d'une caméra dans la mosaïque : son direct (le flux MJPEG que l'API relaie depuis go2rtc), ou un cadre
 * noir quand la caméra est éteinte ou démarre ; un clic ouvre son détail. L'alimentation est lue comme pour la carte.
 */
const LiveTile = ({ apiKey, camera, lastEvent, read, onOpenClip, onOpen }: LiveTileProps) => {
  const { power } = usePower(apiKey, camera.name)
  const mobile = useMobile()
  // La température du détecteur de la caméra, posée sur la vignette.
  const sensorId = CAMERA_SENSOR[camera.name]
  const sensors = useSensors(apiKey, sensorId !== undefined)
  const temperatures = sensorId === undefined ? [] : temperatureItems(sensors, [sensorId])
  // Le rond de la lampe de la caméra (« Perruche » pour voliere-interieur), à côté de la température.
  const lampId = CAMERA_LAMP[camera.name]
  const lamp = useLamp(apiKey, lampId, lampId !== undefined)
  // Le clip, pas le mouvement : son début réel et sa durée (lue dans la vidéo).
  const clipSeconds = useClipDuration(lastEvent?.id ?? null, lastEvent?.clip_h264 ?? lastEvent?.clip ?? null)
  // Le carré de la prise connectée (vert allumée, rouge éteinte), à côté du rond de la lampe.
  const plug = usePlug(apiKey, CAMERA_WITH_PLUG.includes(camera.name))
  const turned = camera.orientation === 'portrait'
  const off = power !== null && !power.on
  const starting = power !== null && power.on && !power.streaming
  const placeholder = off ? OFF_TEXT : starting ? STARTING_TEXT : ''
  const caption = off ? CAPTION_OFF : starting ? CAPTION_STARTING : ''
  return (
    <CameraTile
      name={`${NAME_PREFIX}${camera.name}`}
      caption={caption}
      overlay={
        (temperatures.length > 0 || lamp !== null || plug !== null || (camera.rain ?? 'off') !== 'off') && !placeholder ? (
          <CameraIndicators temperatures={temperatures.map((item) => item.value)} lamp={lamp} plug={plug} rain={camera.rain} />
        ) : undefined
      }
      media={
        <RotatedMedia turned={turned}>
          <ImageBox src={placeholder ? '' : liveSrc(camera.name, false, mobile)} message={placeholder || NO_IMAGE_TEXT} upright={turned} />
        </RotatedMedia>
      }
      footer={
        lastEvent ? (
          <>
            <span className={EVENT_TEXT_CLASS}>
              {LAST_EVENT_PREFIX}
              {[
                lastEvent.label,
                formatTime(lastEvent.clip_started_at ?? lastEvent.started_at),
                ...(clipSeconds === null ? [] : [`${Math.max(1, Math.round(clipSeconds))} s`]),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {lastEvent.clip ? <span className={read ? READ_CLASS : UNREAD_CLASS}>{read ? READ_TEXT : UNREAD_TEXT}</span> : null}
          </>
        ) : (
          NO_EVENT_TEXT
        )
      }
      alert={off}
      onOpenFooter={onOpenClip}
      onOpen={onOpen}
    />
  )
}

export default LiveTile
