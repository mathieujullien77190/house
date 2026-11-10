import { useRef, useState } from 'react'
import { CAMERA_LAMP } from '@/components/CameraCard/constants'
import { useLampPlan } from '@/lib/useLampPlan'
import { usePower } from '@/lib/usePower'
import { usePlug } from '@/lib/usePlug'
import { useMatchHeight } from '@/lib/useMatchHeight'
import { useMobile } from '@/lib/useMobile'
import { usePlan } from '@/lib/usePlan'
import { PLAN_PLUG_POSITION } from '@/components/Lights'
import LiveTile from '@/components/LiveTile'
import MapPlan from '@/components/MapPlan'
import { PARCEL_GATES } from '@/components/MapPlan/parcel'
import {
  GRID_CLASS,
  RIGHT_CLASS,
  PLAN_SECTION_CLASS,
  MAP_WRAPPER_CLASS,
  PLUG_ID,
  TILE_CLASS,
  TILE_HIGHLIGHT_CLASS,
  TILE_LANDSCAPE_CLASS,
  TILE_PORTRAIT_CLASS,
  TILE_START_CLASS,
} from './constants'
import { orderedCameras } from './helpers'
import type { CameraMosaicProps } from './types'

/**
 * La mosaïque : le direct de toutes les caméras côte à côte ; un clic sur une vignette ouvre le détail de la caméra. Le plan de la carte (arbres, haies, cage, portes, caméras du plan,
 * lampe, prise, liens avec les vraies caméras) vient de House API seule (`usePlan`) : rien n'est gardé dans le navigateur.
 */
const CameraMosaic = ({ apiKey, cameras, events, isRead, onOpen }: CameraMosaicProps) => {
  const plan = usePlan(apiKey)
  const { trees, hedges, offsets, links, cage, cameras: planCameras } = plan
  const { moveTree, resizeTree, moveHedge, moveOffset, link, moveCamera, adjustCamera, moveItem } = plan
  const [selectedHedge, setSelectedHedge] = useState('')
  // L'arbre choisi : une poignée sur son bord règle sa taille.
  const [selectedTree, setSelectedTree] = useState('')
  // Sur téléphone (sous 1024 px) : pas de carte du tout (elle n'est même pas chargée).
  const mobile = useMobile()
  // Toutes les lampes du pont (relues toutes les 5 s ; rien sans pont Hue) : « Perruche » dans la cage se voit toujours, les autres une fois le toit caché.
  const { lamps: planLamps, toggle: toggleLamp } = useLampPlan(apiKey, plan.items, !mobile)
  const lamp = planLamps.find((item) => item.id === CAMERA_LAMP['voliere-interieur'])
  // La position de la prise (déplacée, sinon sa place de départ) ; celle de la lampe vient de `planLamps`.
  const plugAt = plan.items[PLUG_ID] ?? PLAN_PLUG_POSITION
  // La prise connectée, avec son état (marche ou arrêt) ; rien sans prise configurée.
  const plug = usePlug(apiKey, true)
  const planPlugs = plug ? [{ id: PLUG_ID, name: plug.alias, x: plugAt.x, y: plugAt.y, on: plug.on }] : []
  // On déplace la cage : la lampe et la prise qui sont dedans la suivent.
  const moveCage = (x: number, y: number) => {
    const dx = x - cage.x
    const dy = y - cage.y
    if (dx === 0 && dy === 0) return
    plan.moveCage(x, y)
    if (lamp) moveItem(lamp.id, lamp.x + dx, lamp.y + dy)
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
  // Contour rouge : la vraie caméra est éteinte, ou la caméra du plan n'est liée à aucune vraie caméra.
  const shownCameras = planCameras.map((camera) =>
    offPlanIds.includes(camera.id) || !links[camera.id] ? { ...camera, off: true } : camera,
  )
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
        className={`${TILE_CLASS} ${camera.orientation === 'portrait' ? `${TILE_START_CLASS} ${TILE_PORTRAIT_CLASS}` : TILE_LANDSCAPE_CLASS} ${planId !== undefined && planId === selectedCamera ? TILE_HIGHLIGHT_CLASS : ''}`}
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
  // La vignette de droite a exactement la hauteur de la carte.
  const mapBox = useRef<HTMLDivElement>(null)
  const sideBox = useRef<HTMLDivElement>(null)
  useMatchHeight(mapBox, sideBox)
  return (
    <>
      <div className={GRID_CLASS}>
        {ordered.filter((camera) => camera.orientation !== 'portrait').map(tile)}
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
                onToggleLamp={toggleLamp}
                plugs={planPlugs}
                onMovePlug={moveItem}
              />
            </div>
          </div>
        )}
        <div ref={sideBox} className={RIGHT_CLASS}>
          {ordered.filter((camera) => camera.orientation === 'portrait').map(tile)}
        </div>
      </div>
    </>
  )
}

export default CameraMosaic
