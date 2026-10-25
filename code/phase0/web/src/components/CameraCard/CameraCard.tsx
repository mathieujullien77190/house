import { useEffect, useState } from 'react'
import CameraCardUI from './UI'
import { IMAGE_ERROR_TEXT, IMAGE_REFRESH_MS } from './constants'
import { imageSrc, lastEventText } from './helpers'
import type { CameraCardProps } from './types'

/** Une caméra : sa dernière image (rechargée à intervalle régulier depuis Frigate) et ses événements. */
const CameraCard = ({ apiKey, camera, events }: CameraCardProps) => {
  const [tick, setTick] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), IMAGE_REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <CameraCardUI
      apiKey={apiKey}
      name={camera.name}
      imageSrc={imageSrc(camera.imageUrl, tick)}
      lastEventText={lastEventText(events)}
      events={events}
      onImageError={() => console.warn(IMAGE_ERROR_TEXT)}
    />
  )
}

export default CameraCard
