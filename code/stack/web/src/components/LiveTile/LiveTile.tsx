import { CameraTile, SnapshotImage as ImageBox, ValueChips } from '@house/ui'
import { CAMERA_SENSOR } from '@/components/CameraCard/constants'
import { temperatureItems } from '@/components/CameraCard/helpers'
import { liveSrc } from '@/lib/live'
import { useMobile } from '@/lib/useMobile'
import { useSensors } from '@/lib/useSensors'
import { usePower } from '@/lib/usePower'
import { CAPTION_OFF, CAPTION_STARTING, NAME_PREFIX, NO_IMAGE_TEXT, OFF_TEXT, STARTING_TEXT } from './constants'
import type { LiveTileProps } from './types'

/**
 * La vignette d'une caméra dans la mosaïque : son direct (le flux MJPEG que l'API relaie depuis go2rtc), ou un cadre
 * noir quand la caméra est éteinte ou démarre ; un clic ouvre son détail. L'alimentation est lue comme pour la carte.
 */
const LiveTile = ({ apiKey, camera, onOpen }: LiveTileProps) => {
  const { power } = usePower(apiKey, camera.name)
  const mobile = useMobile()
  // La température du détecteur de la caméra, posée sur la vignette.
  const sensorId = CAMERA_SENSOR[camera.name]
  const sensors = useSensors(apiKey, sensorId !== undefined)
  const temperatures = sensorId === undefined ? [] : temperatureItems(sensors, [sensorId])
  const off = power !== null && !power.on
  const starting = power !== null && power.on && !power.streaming
  const placeholder = off ? OFF_TEXT : starting ? STARTING_TEXT : ''
  const caption = off ? CAPTION_OFF : starting ? CAPTION_STARTING : ''
  return (
    <CameraTile
      name={`${NAME_PREFIX}${camera.name}`}
      caption={caption}
      overlay={temperatures.length > 0 && !placeholder ? <ValueChips values={temperatures.map((item) => item.value)} /> : undefined}
      media={<ImageBox src={placeholder ? '' : liveSrc(camera.name, false, mobile)} message={placeholder || NO_IMAGE_TEXT} />}
      onOpen={onOpen}
    />
  )
}

export default LiveTile
