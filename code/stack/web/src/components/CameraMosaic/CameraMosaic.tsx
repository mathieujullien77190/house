import { useRef, useState } from 'react'
import { CAMERA_LAMP, TURNED_CAMERAS } from '@/components/CameraCard/constants'
import { useLamp } from '@/lib/useLamp'
import { usePower } from '@/lib/usePower'
import { usePlug } from '@/lib/usePlug'
import { usePlanCage } from '@/lib/usePlanCage'
import { usePlanCameras } from '@/lib/usePlanCameras'
import { usePlanHedges } from '@/lib/usePlanHedges'
import { usePlanItems } from '@/lib/usePlanItems'
import { useMatchHeight } from '@/lib/useMatchHeight'
import { useMobile } from '@/lib/useMobile'
import { usePlanLinks } from '@/lib/usePlanLinks'
import { usePlanMoves } from '@/lib/usePlanMoves'
import { usePlanSync } from '@/lib/usePlanSync'
import { usePlanTrees } from '@/lib/usePlanTrees'
import { DEFAULT_TREES, PLAN_CAGE, PLAN_CAMERAS, PLAN_LAMP_POSITION, PLAN_PLUG_POSITION } from '@/components/Lights'
import LiveTile from '@/components/LiveTile'
import MapPlan from '@/components/MapPlan'
import { PARCEL_GATES, PARCEL_HEDGES } from '@/components/MapPlan/parcel'
import {
  GRID_CLASS,
  RIGHT_CLASS,
  PLAN_SECTION_CLASS,
  MAP_WRAPPER_CLASS,
  PLUG_ID,
  TILE_CLASS,
  TILE_HIGHLIGHT_CLASS,
  TILE_PORTRAIT_CLASS,
} from './constants'
import { orderedCameras } from './helpers'
import type { CameraMosaicProps } from './types'

/** La mosaïque, avec son plan tenu d'accord avec House API (le plan de l'API, s'il en diffère, remplace celui de l'appareil : la mosaïque est alors remontée pour le relire). */
const CameraMosaic = (props: CameraMosaicProps) => {
  const version = usePlanSync(props.apiKey)
  return <Mosaic key={version} {...props} />
}

/** La mosaïque : le direct de toutes les caméras côte à côte ; un clic sur une vignette ouvre le détail de la caméra. */
const Mosaic = ({ apiKey, cameras, events, isRead, onOpen }: CameraMosaicProps) => {
  const { trees, move: moveTree, resize: resizeTree } = usePlanTrees(DEFAULT_TREES)
  // La cage à perruches, le chemin du garage et les portes se déplacent en entier.
  const { cage, move: moveCageTo } = usePlanCage(PLAN_CAGE)
  const { offsets, move: moveOffset } = usePlanMoves()
  // Le lien de chaque caméra du plan avec une vraie caméra (choisi dans le plan, en mode modification).
  const { links, link } = usePlanLinks()
  // Les haies, posées au départ sur la limite de la parcelle ; un clic en choisit une (ses sommets se glissent), le glisser la déplace.
  const { hedges, move: moveHedge } = usePlanHedges(PARCEL_HEDGES)
  const [selectedHedge, setSelectedHedge] = useState('')
  // L'arbre choisi : une poignée sur son bord règle sa taille.
  const [selectedTree, setSelectedTree] = useState('')
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
  // On déplace la cage : la lampe et la prise qui sont dedans la suivent.
  const moveCage = (x: number, y: number) => {
    const dx = x - cage.x
    const dy = y - cage.y
    if (dx === 0 && dy === 0) return
    moveCageTo(x, y)
    if (lamp) moveItem(lamp.id, lampAt.x + dx, lampAt.y + dy)
    if (plug) moveItem(PLUG_ID, plugAt.x + dx, plugAt.y + dy)
  }
  // Une caméra du plan dont la vraie caméra est éteinte (PoE coupé) a un contour rouge.
  const powerInside = usePower(apiKey, 'voliere-interieur').power
  const powerOutside = usePower(apiKey, 'voliere-exterieur').power
  const offNames = [
    ...(powerInside !== null && !powerInside.on ? ['voliere-interieur'] : []),
    ...(powerOutside !== null && !powerOutside.on ? ['voliere-exterieur'] : []),
  ]
  const offPlanIds = Object.entries(links)
    .filter(([, name]) => offNames.includes(name))
    .map(([planId]) => planId)
  const shownCameras = planCameras.map((camera) => (offPlanIds.includes(camera.id) ? { ...camera, off: true } : camera))
  // La caméra dont on voit le champ de vision : un clic sur son icône l'affiche, un second le cache.
  const [selectedCamera, setSelectedCamera] = useState('')
  // L'icône a été sélectionnée en passant la souris sur la vignette (elle se désélectionne alors quand la souris la quitte).
  const byHover = useRef(false)
  // Une vignette de caméra ; survoler sa vignette choisit l'icône liée sur le plan.
  const tile = (camera: CameraMosaicProps['cameras'][number]) => {
    const last = events.find((event) => event.camera === camera.name)
    const planId = Object.entries(links).find(([, name]) => name === camera.name)?.[0]
    return (
      <div
        key={camera.name}
        className={`${TILE_CLASS} ${TURNED_CAMERAS.includes(camera.name) ? TILE_PORTRAIT_CLASS : ''} ${planId !== undefined && planId === selectedCamera ? TILE_HIGHLIGHT_CLASS : ''}`}
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
  }
  // En haut à gauche, les caméras en paysage (réduites) ; dessous, le plan sur deux colonnes, et tout contre lui, à droite, celles posées de côté (en portrait).
  const ordered = orderedCameras(cameras)
  // Sur téléphone (sous 1024 px) : pas de carte du tout (elle n'est même pas chargée).
  const mobile = useMobile()
  // La vignette de droite a exactement la hauteur de la carte.
  const mapBox = useRef<HTMLDivElement>(null)
  const sideBox = useRef<HTMLDivElement>(null)
  useMatchHeight(mapBox, sideBox)
  return (
    <>
      <div className={GRID_CLASS}>
        {ordered.filter((camera) => !TURNED_CAMERAS.includes(camera.name)).map(tile)}
        {mobile ? null : (
          <div className={PLAN_SECTION_CLASS}>
            <div ref={mapBox} className={MAP_WRAPPER_CLASS}>
              <MapPlan
                cameraNames={cameras.map((camera) => camera.name)}
                links={links}
                onLink={link}
                cage={cage}
                onMoveCage={moveCage}
                offsets={offsets}
                onMoveOffset={moveOffset}
                cameras={shownCameras}
                selectedCameraId={selectedCamera}
                onSelectCamera={(id) => {
                  byHover.current = false
                  setSelectedCamera((current) => (id === '' || current === id ? '' : id))
                }}
                onMoveCamera={moveCamera}
                onAdjustCamera={adjustCamera}
                hedges={hedges}
                selectedHedgeId={selectedHedge}
                onSelectHedge={(id) => setSelectedHedge((current) => (id === '' || current === id ? '' : id))}
                onMoveHedge={moveHedge}
                trees={trees}
                selectedTreeId={selectedTree}
                onSelectTree={setSelectedTree}
                onMoveTree={moveTree}
                onResizeTree={resizeTree}
                gates={PARCEL_GATES}
                lamps={planLamps}
                onMoveLamp={moveItem}
                plugs={planPlugs}
                onMovePlug={moveItem}
              />
            </div>
          </div>
        )}
        <div ref={sideBox} className={RIGHT_CLASS}>
          {ordered.filter((camera) => TURNED_CAMERAS.includes(camera.name)).map(tile)}
        </div>
      </div>
    </>
  )
}

export default CameraMosaic
