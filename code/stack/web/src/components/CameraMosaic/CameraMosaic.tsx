import LiveTile from '@/components/LiveTile'
import { GRID_CLASS } from './constants'
import type { CameraMosaicProps } from './types'

/** La mosaïque : le direct de toutes les caméras côte à côte ; un clic sur une vignette ouvre le détail de la caméra. */
const CameraMosaic = ({ apiKey, cameras, onOpen }: CameraMosaicProps) => {
  return (
    <div className={GRID_CLASS}>
      {cameras.map((camera) => (
        <LiveTile key={camera.name} apiKey={apiKey} camera={camera} onOpen={() => onOpen(camera.name)} />
      ))}
    </div>
  )
}

export default CameraMosaic
