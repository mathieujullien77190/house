import { useRef } from 'react'
import LiveTile from '@/components/LiveTile'
import { useStackWidth } from '@/lib/useStackWidth'
import {
  GRID_CLASS,
  GRID_PORTRAIT_MIDDLE_CLASS,
  MIDDLE_CAMERA,
  PLACEMENT,
  STACK_CAMERAS,
  STACK_CLASS,
  TILE_CLASS,
  TILE_PORTRAIT_CLASS,
} from './constants'
import { orderedCameras } from './helpers'
import type { CameraMosaicProps } from './types'

/** La mosaïque : le direct de toutes les caméras côte à côte ; un clic sur une vignette ouvre le détail de la caméra. */
const CameraMosaic = ({ apiKey, cameras, events, isRead, onOpen }: CameraMosaicProps) => {
  const grid = useRef<HTMLDivElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const middle = useRef<HTMLDivElement>(null)
  // Les deux vignettes en paysage empilées ont, avec l'espace entre elles, la hauteur de la vignette en portrait voisine.
  useStackWidth(grid, stack, middle)
  // Une vignette de caméra : le direct, son dernier événement et son état lu / non lu.
  const tile = (camera: CameraMosaicProps['cameras'][number]) => {
    const last = events.find((event) => event.camera === camera.name)
    return (
      <div
        key={camera.name}
        ref={camera.name === MIDDLE_CAMERA ? middle : undefined}
        className={`${TILE_CLASS} ${PLACEMENT[camera.name] ?? ''} ${camera.orientation === 'portrait' ? TILE_PORTRAIT_CLASS : ''}`}
      >
        <LiveTile
          apiKey={apiKey}
          camera={camera}
          lastEvent={last}
          read={last ? isRead(last.id) : false}
          onOpen={() => onOpen(camera.name)}
          onOpenClip={last?.clip ? () => onOpen(camera.name, last.id) : undefined}
        />
      </div>
    )
  }
  const ordered = orderedCameras(cameras)
  // La colonne 2 est celle de l'extérieur : en portrait, sa colonne se cale sur la largeur de sa vidéo.
  const portraitMiddle = ordered.some((camera) => camera.name === MIDDLE_CAMERA && camera.orientation === 'portrait')
  const stacked = ordered.filter((camera) => STACK_CAMERAS.includes(camera.name))
  return (
    <div ref={grid} className={portraitMiddle ? GRID_PORTRAIT_MIDDLE_CLASS : GRID_CLASS}>
      {stacked.length > 0 ? (
        <div ref={stack} className={STACK_CLASS}>
          {stacked.map(tile)}
        </div>
      ) : null}
      {ordered.filter((camera) => !STACK_CAMERAS.includes(camera.name)).map(tile)}
    </div>
  )
}

export default CameraMosaic
