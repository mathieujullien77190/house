import { useRef, useState } from 'react'
import { LightsPlan, SectionTitle } from '@house/ui'
import { CAMERA_LAMP } from '@/components/CameraCard/constants'
import { useLamp } from '@/lib/useLamp'
import { usePower } from '@/lib/usePower'
import { usePlug } from '@/lib/usePlug'
import { usePlanCameras } from '@/lib/usePlanCameras'
import { usePlanItems } from '@/lib/usePlanItems'
import { usePlanTrees } from '@/lib/usePlanTrees'
import {
  DEFAULT_TREES,
  HOUSE_SHIFT,
  PLAN_EXTENSION,
  PLAN_FLOOR_PATHS,
  PLAN_FLOORS,
  PLAN_GARDEN,
  PLAN_CAGE,
  PLAN_CAGE_LABEL,
  PLAN_CAMERA_LINKS,
  PLAN_CAMERAS,
  PLAN_GATES,
  PLAN_LAMP_POSITION,
  PLAN_LAMP_RADIUS,
  PLAN_PLUG_POSITION,
  PLAN_PATHS,
  PLAN_HEDGES,
  PLAN_TERRACE,
  PLAN_TITLE,
  PLAN_VIEW,
} from '@/components/Lights'
import LiveTile from '@/components/LiveTile'
import {
  CAMERAS_TITLE,
  GRID_CLASS,
  PLAN_SECTION_CLASS,
  PLAN_TITLE_TEXT,
  PLUG_ID,
  TILE_CLASS,
  TILE_HIGHLIGHT_CLASS,
  NO_ROOMS,
  PLAN_CLASS,
  noop,
} from './constants'
import { orderedCameras } from './helpers'
import type { CameraMosaicProps } from './types'

/** La mosaïque : le direct de toutes les caméras côte à côte ; un clic sur une vignette ouvre le détail de la caméra. */
const CameraMosaic = ({ apiKey, cameras, events, isRead, onOpen }: CameraMosaicProps) => {
  const { trees, move: moveTree } = usePlanTrees(DEFAULT_TREES)
  const { cameras: planCameras, move: moveCamera, adjust: adjustCamera } = usePlanCameras(PLAN_CAMERAS)
  // La lampe « Perruche » dans la cage, avec son état actuel (relu toutes les 5 s) ; rien sans pont Hue.
  const lamp = useLamp(apiKey, CAMERA_LAMP['voliere-interieur'], true)
  // Les positions de la lampe et de la prise, qu'on déplace (gardées dans le navigateur), sinon leur place par défaut.
  const { positions: itemPositions, move: moveItem } = usePlanItems()
  const lampAt = itemPositions[lamp?.id ?? ''] ?? PLAN_LAMP_POSITION
  const plugAt = itemPositions[PLUG_ID] ?? PLAN_PLUG_POSITION
  const planLamps = lamp ? [{ id: lamp.id, name: lamp.name, x: lampAt.x, y: lampAt.y, on: lamp.on, reachable: lamp.reachable }] : []
  // La prise connectée, avec son état (marche ou arrêt) ; rien sans prise configurée.
  const plug = usePlug(apiKey, true)
  const planPlugs = plug ? [{ id: PLUG_ID, name: plug.alias, x: plugAt.x, y: plugAt.y, on: plug.on }] : []
  // Une caméra du plan dont la vraie caméra est éteinte (PoE coupé) a un contour rouge.
  const powerInside = usePower(apiKey, 'voliere-interieur').power
  const powerOutside = usePower(apiKey, 'voliere-exterieur').power
  const offPlanIds = [
    ...(powerInside !== null && !powerInside.on ? [PLAN_CAMERA_LINKS['voliere-interieur']] : []),
    ...(powerOutside !== null && !powerOutside.on ? [PLAN_CAMERA_LINKS['voliere-exterieur']] : []),
  ]
  const shownCameras = planCameras.map((camera) => (offPlanIds.includes(camera.id) ? { ...camera, off: true } : camera))
  // La caméra dont on voit le champ de vision : un clic sur son icône l'affiche, un second le cache.
  const [selectedCamera, setSelectedCamera] = useState('')
  // L'icône a été sélectionnée en passant la souris sur la vignette (elle se désélectionne alors quand la souris la quitte).
  const byHover = useRef(false)
  return (
    <>
      <SectionTitle text={CAMERAS_TITLE} />
      <div className={GRID_CLASS}>
        {orderedCameras(cameras).map((camera) => {
          const last = events.find((event) => event.camera === camera.name)
          const planId = PLAN_CAMERA_LINKS[camera.name]
          return (
            <div
              key={camera.name}
              className={`${TILE_CLASS} ${planId !== undefined && planId === selectedCamera ? TILE_HIGHLIGHT_CLASS : ''}`}
              onMouseEnter={() => {
                if (planId === undefined) return
                byHover.current = selectedCamera !== planId
                setSelectedCamera(planId)
              }}
              onMouseLeave={() => {
                if (planId === undefined || !byHover.current) return
                byHover.current = false
                setSelectedCamera((current) => (current === planId ? '' : current))
              }}
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
        })}
      </div>
      <div className={PLAN_SECTION_CLASS}>
        <SectionTitle text={PLAN_TITLE_TEXT} />
        <div className={PLAN_CLASS}>
          <LightsPlan
            title={PLAN_TITLE}
            rooms={NO_ROOMS}
            walls={NO_ROOMS}
            roof
            terrace={PLAN_TERRACE}
            concreteNorth
            houseShift={HOUSE_SHIFT}
            floors={PLAN_FLOORS}
            floorPaths={PLAN_FLOOR_PATHS}
            extension={PLAN_EXTENSION}
            gates={PLAN_GATES}
            paths={PLAN_PATHS}
            cameras={shownCameras}
            onMoveCamera={moveCamera}
            onAdjustCamera={adjustCamera}
            selectedCameraId={selectedCamera}
            onSelectCamera={(id) => {
              byHover.current = false
              setSelectedCamera((current) => (id === '' || current === id ? '' : id))
            }}
            hedges={PLAN_HEDGES}
            view={PLAN_VIEW}
            lamps={planLamps}
            lampRadius={PLAN_LAMP_RADIUS}
            onMove={moveItem}
            onMovePlug={moveItem}
            plugs={planPlugs}
            bare
            gardenOutline={PLAN_GARDEN}
            trees={trees}
            onMoveTree={moveTree}
            cage={PLAN_CAGE}
            cageLabel={PLAN_CAGE_LABEL}
            onToggle={noop}
          />
        </div>
      </div>
    </>
  )
}

export default CameraMosaic
