import { useRef } from 'react'
import { CameraTile } from '@house/ui'
import LiveTile from '@/components/LiveTile'
import { useStackWidth } from '@/lib/useStackWidth'
import {
  GRID_CLASS,
  GRID_PORTRAIT_MIDDLE_CLASS,
  MIDDLE_CAMERA,
  PLACEMENT,
  PLANNED_FOOTER,
  PLANNED_FOOTER_CLASS,
  PLANNED_FILL_CAMERAS,
  PLANNED_MEDIA_CLASS,
  PLANNED_MEDIA_FILL_CLASS,
  PLANNED_TEXT,
  RIGHT_STACK_CAMERAS,
  RIGHT_STACK_CLASS,
  STACK_CAMERAS,
  STACK_CLASS,
  TILE_CLASS,
  TILE_PORTRAIT_CLASS,
} from './constants'
import { orderedCameras, plannedMissing } from './helpers'
import type { CameraMosaicProps } from './types'

/** La mosaïque : le direct de toutes les caméras côte à côte ; un clic sur une vignette ouvre le détail de la caméra. */
const CameraMosaic = ({ apiKey, cameras, events, isRead, onOpen }: CameraMosaicProps) => {
  const grid = useRef<HTMLDivElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const middle = useRef<HTMLDivElement>(null)
  // Les deux vignettes en paysage empilées ont, avec l'espace entre elles, la hauteur de la vignette en portrait voisine.
  useStackWidth(grid, stack, middle)
  // Une vignette de caméra : le direct, son dernier événement et son état lu / non lu.
  const missing = plannedMissing(cameras)
  const tile = (camera: CameraMosaicProps['cameras'][number]) => {
    // Une caméra prévue absente de l'API : un cadre noir, ni flux ni requête, et rien à ouvrir.
    if (missing.includes(camera.name)) {
      // Sous l'extérieur en portrait, une vignette étroite : son cadre noir est rehaussé à la hauteur des autres.
      const fill = portraitMiddle && PLANNED_FILL_CAMERAS.includes(camera.name)
      return (
        <div key={camera.name} className={`${TILE_CLASS} ${PLACEMENT[camera.name] ?? ''}`}>
          <CameraTile name={camera.name} media={<div className={fill ? PLANNED_MEDIA_FILL_CLASS : PLANNED_MEDIA_CLASS}>{PLANNED_TEXT}</div>} footer={<span className={PLANNED_FOOTER_CLASS}>{PLANNED_FOOTER}</span>} />
        </div>
      )
    }
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
  const ordered = orderedCameras([...cameras, ...missing.map((name): CameraMosaicProps['cameras'][number] => ({ name, orientation: 'landscape' }))])
  // La colonne 2 est celle de l'extérieur : en portrait, sa colonne se cale sur la largeur de sa vidéo.
  const portraitMiddle = ordered.some((camera) => camera.name === MIDDLE_CAMERA && camera.orientation === 'portrait')
  const stacked = ordered.filter((camera) => STACK_CAMERAS.includes(camera.name))
  const stackedRight = ordered.filter((camera) => RIGHT_STACK_CAMERAS.includes(camera.name))
  return (
    <div ref={grid} className={portraitMiddle ? GRID_PORTRAIT_MIDDLE_CLASS : GRID_CLASS}>
      {stacked.length > 0 ? (
        <div ref={stack} className={STACK_CLASS}>
          {stacked.map(tile)}
        </div>
      ) : null}
      {/* Sur téléphone (une colonne) l'ordre est celui d'ici : l'extérieur avant le salon de jardin et le potager. */}
      {ordered.filter((camera) => camera.name === MIDDLE_CAMERA).map(tile)}
      {/* Jamais vide : le potager est toujours là, venu de l'API ou prévu. */}
      <div className={RIGHT_STACK_CLASS}>{stackedRight.map(tile)}</div>
      {ordered.filter((camera) => !STACK_CAMERAS.includes(camera.name) && !RIGHT_STACK_CAMERAS.includes(camera.name) && camera.name !== MIDDLE_CAMERA).map(tile)}
    </div>
  )
}

export default CameraMosaic
