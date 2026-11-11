import { useEffect, useRef, useState } from 'react'
import AcPreview from '@/components/AcPreview'
import ClipPreview from '@/components/ClipPreview'
import { CAMERA_LAMP } from '@/components/CameraCard/constants'
import { PLAN_PLUG_POSITION } from '@/components/Lights'
import LiveTile from '@/components/LiveTile'
import MapPlan from '@/components/MapPlan'
import PlugPanel from '@/components/PlugPanel'
import ShutterPreview from '@/components/ShutterPreview'
import { decorItemId, DEFAULT_DECORS } from '@/components/MapPlan/helpers'
import { roomItems, roomRectsFrom } from '@/components/MapPlan/helpers'
import { PLAN_ROOMS } from '@/components/Lights/constants'
import { garageCornerId, garageRingFrom, tilesCornerId, tilesRingFrom } from '@/components/MapPlan/helpers'
import { PARCEL_GATES } from '@/components/MapPlan/parcel'
import { acItemId, useAcPlan } from '@/lib/useAcPlan'
import { emojiItemId, useClipEmojis } from '@/lib/useClipEmojis'
import { useLampPlan } from '@/lib/useLampPlan'
import { chooseOnHome, useHomeSelection } from '@/lib/homeSelection'
import { useMobile } from '@/lib/useMobile'
import { labelItemId, useTemperatureLabels } from '@/lib/useTemperatureLabels'
import { shutterItemId, useShutterPlan } from '@/lib/useShutterPlan'
import { usePlan } from '@/lib/usePlan'
import { usePlug } from '@/lib/usePlug'
import { useOffCameras } from '@/lib/useOffCameras'
import {
  PREVIEW_VIEW,
  PLUG_ID,
  THUMBNAIL_CHROME,
  COMPACT_CLASS,
  THUMBNAIL_CLASS,
  THUMBNAIL_GAP,
  THUMBNAIL_PORTRAIT_WIDTH,
  THUMBNAIL_WIDTH,
  WRAPPER_CLASS,
} from './constants'
import type { HouseMapProps } from './types'

/**
 * La carte de la maison de l'accueil : le plan (arbres, haies, cage, portes, caméras du plan, prise, liens avec les vraies caméras) vient de House API seule (`usePlan`) : rien n'est
 * gardé dans le navigateur. Le toit est caché : on voit les pièces et les cloisons, les caméras (un clic montre leur champ de vision) et toutes les lampes du pont (un clic les allume ou
 * les éteint), relues toutes les 5 s.
 */
const HouseMap = ({ apiKey, cameras, events, isRead, onOpenCamera, onOpenAc, onOpenShutter, onOpenPlug }: HouseMapProps) => {
  const plan = usePlan(apiKey)
  const { trees, hedges, offsets, links, cage, cameras: planCameras } = plan
  const { moveTree, resizeTree, moveHedge, moveOffset, link, moveCamera, adjustCamera, moveItem, moveItems } = plan
  const [selectedHedge, setSelectedHedge] = useState('')
  // L'arbre choisi : une poignée sur son bord règle sa taille.
  const [selectedTree, setSelectedTree] = useState('')
  // Toutes les lampes du pont (relues toutes les 5 s ; rien sans pont Hue).
  const { lamps: planLamps, toggle: toggleLamp } = useLampPlan(apiKey, plan.items, true)
  // Les emoji des clips sauvegardés (relus toutes les 30 s) : on les déplace en modification, un clic montre le clip.
  const { emojis: planEmojis, clips } = useClipEmojis(apiKey, plan.items, true)
  // Les climatisations (un rectangle chacune : un clic ouvre leur page, on les déplace en modification).
  const acs = useAcPlan(apiKey, plan.items, true)
  // Les icônes seules (la pompe à chaleur) : leur place est gardée dans les éléments du plan, la place de départ sans elle.
  const decors = DEFAULT_DECORS.map((decor) => ({ ...decor, ...plan.items[decorItemId(decor.id)] }))
  // Les volets roulants (une icône : un clic le descend ou le monte, on la déplace en modification).
  const { shutters } = useShutterPlan(apiKey, plan.items, true)
  // Les étiquettes de température : dehors (la météo) et deux dans la cage à perruches (les détecteurs).
  const labels = useTemperatureLabels(apiKey, plan.items, cage, acs, true)
  const lamp = planLamps.find((item) => item.id === CAMERA_LAMP['voliere-interieur'])
  // La position de la prise (déplacée, sinon sa place de départ) ; celle des lampes vient de `planLamps`.
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
  // Une caméra du plan dont la vraie caméra est éteinte (PoE coupé sur le switch) : on lit l'alimentation de **toutes** les caméras, pas seulement de deux.
  const offNames = useOffCameras(apiKey)
  const offPlanIds = Object.entries(links)
    .filter(([, name]) => offNames.includes(name))
    .map(([planId]) => planId)
  // Trois états : liée et allumée (contour vert), liée mais éteinte (`off` : rond rouge, caméra blanche), non liée à une vraie caméra (`missing` : caméra rouge, contour rouge).
  const shownCameras = planCameras.map((camera) =>
    !links[camera.id] ? { ...camera, missing: true } : offPlanIds.includes(camera.id) ? { ...camera, off: true } : camera,
  )
  // La caméra choisie : son champ de vision s'affiche. **Sur grand écran** un clic la choisit (la carte prend PREVIEW_VIEW et sa miniature en direct s'affiche à droite) et un double clic ouvre sa page ;
  // **sur téléphone** un clic ouvre directement sa page.
  const mobile = useMobile()
  // La sélection (caméra, chauffage, clim, volet, emoji de clip) est **globale** (`lib/homeSelection.ts`) : elle survit à un changement d'onglet (la Home est démontée, la sélection reste).
  const { camera: selectedCamera, plug: selectedPlug, ac: selectedAc, shutter: selectedShutter, emoji: selectedEmoji } = useHomeSelection()
  const real = selectedCamera && links[selectedCamera] ? cameras.find((camera) => camera.name === links[selectedCamera]) : undefined
  // Un clic sur une caméra la choisit toujours (pas de bascule : un second clic, ou deux événements pour un clic, ne la referme pas) ; un clic à côté la ferme.
  // La prise (le chauffage), une clim, un volet et l'emoji d'un clip se comportent pareil : un clic les choisit (la carte prend la même vue, leur bloc s'affiche à droite), un double clic ouvre leur page,
  // un clic à côté ferme ; sur téléphone, un clic ouvre la page. Choisir un objet lâche les autres.
  const select = (id: string) => {
    if (mobile && id && links[id]) {
      chooseOnHome()
      onOpenCamera(links[id])
    } else chooseOnHome({ camera: id })
  }
  const selectAc = (id: string) => {
    if (mobile) {
      onOpenAc()
      return
    }
    chooseOnHome({ ac: id })
  }
  const selectShutter = (id: string) => {
    if (mobile) {
      onOpenShutter()
      return
    }
    chooseOnHome({ shutter: id })
  }
  const selectEmoji = (id: string) => {
    const clip = clips[id]
    if (!clip) return
    if (mobile) {
      onOpenCamera(clip.camera, clip.id)
      return
    }
    chooseOnHome({ emoji: id })
  }
  const selectPlug = () => {
    if (mobile) {
      onOpenPlug()
      return
    }
    chooseOnHome({ plug: true })
  }
  // Un aperçu est ouvert : celui d'une caméra liée à une vraie caméra, ou celui du chauffage (grand écran seulement).
  // Les flux légers de toutes les caméras liées à une icône du plan sont ouverts dès l'ouverture de la Home (leur miniature est seulement cachée) : un clic sur une caméra l'affiche tout de suite.
  // (Pas sur téléphone : aucun aperçu n'y est montré, un clic ouvre la page ; on n'y charge pas de flux pour rien.)
  const preloaded = mobile ? [] : Object.values(links)
  const selectedClip = selectedEmoji ? clips[selectedEmoji] : undefined
  const open = (Boolean(real) || selectedPlug || selectedAc !== '' || selectedShutter !== '' || selectedClip !== undefined) && !mobile
  // Un clic en dehors de la carte et de la miniature ferme la miniature ; un clic dans le vide de la carte la ferme aussi (`select('')`, par `MapPlan`).
  const wrapper = useRef<HTMLDivElement>(null)
  // La taille de la carte, relue quand la position de la caméra change (pas de lecture de ref pendant le rendu).
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    // Le conteneur est monté avant cet effet.
    const element = wrapper.current as HTMLDivElement
    setSize({ width: element.clientWidth, height: element.clientHeight })
  }, [open])
  const thumbnail = useRef<HTMLDivElement>(null)
  // La place du bloc, donnée à la carte : elle y tire la ligne bleue depuis l'objet choisi (sous les icônes).
  const [box, setBox] = useState<{ left: number; top: number; height: number } | null>(null)
  const selection = `${selectedCamera}|${selectedPlug}|${selectedAc}|${selectedShutter}|${selectedEmoji}`
  useEffect(() => {
    const element = thumbnail.current
    const host = wrapper.current
    if (!open || !element || !host) return
    const measure = () => {
      const block = element.getBoundingClientRect()
      const map = host.getBoundingClientRect()
      setBox({ left: Math.round(block.left - map.left), top: Math.round(block.top - map.top), height: Math.round(block.height) })
    }
    measure()
    // Le bloc grandit quand son contenu arrive (une clim lue, une vidéo prête) : la ligne suit.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [open, selection, size])
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      const target = event.target as Node
      if (wrapper.current?.contains(target) || thumbnail.current?.contains(target)) return
      chooseOnHome()
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  // La taille de la miniature : 320 px de large pour une caméra en paysage ; **une caméra en portrait est réduite pour tenir dans la hauteur de la carte** (sa vidéo est 9/16 : la largeur
  // vient de la hauteur disponible, moins l'espace autour et ce que la vignette ajoute autour de sa vidéo).
  const { height } = size
  const portrait = real?.orientation === 'portrait'
  const thumbnailWidth = portrait
    ? height > 0
      ? Math.floor(((height - 2 * THUMBNAIL_GAP - THUMBNAIL_CHROME) * 9) / 16)
      : THUMBNAIL_PORTRAIT_WIDTH
    : THUMBNAIL_WIDTH
  // Où la poser : **toujours au même endroit pour tous les aperçus** : en haut à droite de la carte (`top-2.5 right-2.5`).
  const thumbnailStyle = { width: thumbnailWidth }
  return (
    <div ref={wrapper} className={WRAPPER_CLASS}>
      <MapPlan
        fill={mobile}
        cameraNames={cameras.map((camera) => camera.name)}
        links={links}
        onLink={link}
        cage={cage}
        onMoveCage={moveCage}
        offsets={offsets}
        onMoveOffset={moveOffset}
        rooms={roomRectsFrom(
          plan.items,
          PLAN_ROOMS.map((room) => room.rects.length),
        )}
        onMoveRooms={(rooms) => moveItems(roomItems(rooms))}
        garage={garageRingFrom(plan.items)}
        onMoveGarage={(ring) => moveItems(Object.fromEntries(ring.map(([x, y], index) => [garageCornerId(index), { x, y }])))}
        tiles={tilesRingFrom(plan.items)}
        onMoveTiles={(ring) => moveItems(Object.fromEntries(ring.map(([x, y], index) => [tilesCornerId(index), { x, y }])))}
        cameras={shownCameras}
        selectedCameraId={selectedCamera}
        onOpenCamera={(planId) => (links[planId] ? onOpenCamera(links[planId]) : undefined)}
        onSelectCamera={select}
        focusView={open ? PREVIEW_VIEW : null}
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
        acs={acs}
        onOpenAc={() => onOpenAc()}
        emojis={planEmojis}
        decors={decors}
        onMoveDecor={(id, x, y) => moveItem(decorItemId(id), x, y)}
        selectedEmojiId={selectedEmoji}
        onMoveEmoji={(id, x, y) => moveItem(emojiItemId(id), x, y)}
        onToggleEmoji={selectEmoji}
        onOpenEmoji={(id) => (clips[id] ? onOpenCamera(clips[id].camera, clips[id].id) : undefined)}
        linkBox={open ? box : null}
        onSelectAc={selectAc}
        selectedAcId={selectedAc}
        onSelectPlug={selectPlug}
        selectedPlugId={selectedPlug ? PLUG_ID : ''}
        onOpenPlug={() => onOpenPlug()}
        shutters={shutters}
        labels={labels}
        onMoveLabel={(id, x, y) => moveItem(labelItemId(id), x, y)}
        onSelectShutter={selectShutter}
        selectedShutterId={selectedShutter}
        onOpenShutter={() => onOpenShutter()}
        onMoveShutter={(id, x, y) => moveItem(shutterItemId(id), x, y)}
        onMoveAc={(id, x, y) => moveItem(acItemId(id), x, y)}
        plugs={planPlugs}
        onMovePlug={moveItem}
      />
      <div ref={thumbnail} hidden={!open} className={THUMBNAIL_CLASS} style={thumbnailStyle}>
        {cameras
          .filter((camera) => preloaded.includes(camera.name))
          .map((camera) => {
            const lastEvent = events.find((event) => event.camera === camera.name)
            return (
              <div key={camera.name} hidden={!open || camera.name !== real?.name}>
                <LiveTile
                  apiKey={apiKey}
                  camera={camera}
                  lastEvent={lastEvent}
                  read={lastEvent ? isRead(lastEvent.id) : false}
                  onOpen={() => onOpenCamera(camera.name)}
                  onOpenClip={lastEvent?.clip ? () => onOpenCamera(camera.name, lastEvent.id) : undefined}
                />
              </div>
            )
          })}
        {/* Les blocs (clim, volet, chauffage, clip) sont dans un cadre de 320 px : leurs textes sont réduits pour que tout y rentre. */}
        <div className={COMPACT_CLASS}>
          {open && selectedClip ? (
            <ClipPreview
              key={selectedClip.id}
              apiKey={apiKey}
              event={selectedClip}
              onOpen={() => onOpenCamera(selectedClip.camera, selectedClip.id)}
            />
          ) : null}
          {open && !real && selectedShutter ? <ShutterPreview apiKey={apiKey} shutterId={selectedShutter} /> : null}
          {open && !real && selectedAc ? <AcPreview apiKey={apiKey} unitId={selectedAc} /> : null}
          {open && !real && selectedPlug ? <PlugPanel apiKey={apiKey} embedded /> : null}
        </div>
      </div>
    </div>
  )
}

export default HouseMap
