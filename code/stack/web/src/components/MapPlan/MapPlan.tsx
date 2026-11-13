import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
// Le travailleur de MapLibre (décodage des tuiles) est un fichier à part : Vite le copie dans les ressources et donne son adresse (sans cela MapLibre le cherche à côté du script, où il n'est pas).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  Button,
  Checkbox,
  Select,
  type PlanAc,
  type PlanCamera,
  type PlanEmoji,
  type PlanLabel,
  type PlanLamp,
  type PlanPlug,
  type PlanShutter,
} from '@house/ui'
import {
  ATTRIBUTION,
  SATELLITE,
  ALWAYS_HIT,
  EDIT_LABEL,
  FILL_BOTTOM_GAP,
  FILTERS,
  FILTERS_LABEL,
  FILTERS_MENU_CLASS,
  FILTERS_MENU_WRAPPER_CLASS,
  LAMP_LABEL_CLASS,
  LINK_LABEL,
  LINK_NONE,
  FILTERS_BAR_CLASS,
  LAYERS_CLASS,
  MAP_VIEW_CENTER,
  MAP_CLASS,
  MAP_FILL_CLASS,
  MAP_MAX_ZOOM,
  MAP_ROTATION_DEG,
  MAP_ZOOM,
  PROBLEM_CLASS,
  RASTER_MAX_ZOOM,
  RASTER_TILE_SIZE,
  ACTIONS_CLASS,
  WRAPPER_CLASS,
} from './constants'
import { attachEditing } from './edit'
import { planToLngLat } from './projection'
import { addMapIcons, addStatusDots, watchDynamicImages } from './icons'
import {
  defaultRoomRects,
  liveFeatures,
  readPalette,
  staticFeatures,
  type LiveData,
  type Palette,
  type PlanDecor,
} from './features'
import { bulbLabel } from './helpers'
import { addPlanLayers, LINK_SOURCE, POINTS_SOURCE, SHAPES_SOURCE, STATIC_SOURCE } from './layers'
import type { MapPlanProps, ResolvedProps } from './types'

setWorkerUrl(workerUrl)

/** Le centre en [longitude, latitude], l'ordre de MapLibre. */
const CENTER_LNG_LAT: [number, number] = [MAP_VIEW_CENTER[1], MAP_VIEW_CENTER[0]]

const EMPTY_CAMERAS: PlanCamera[] = []
const EMPTY_LAMPS: PlanLamp[] = []
const EMPTY_PLUGS: PlanPlug[] = []
const EMPTY_ACS: PlanAc[] = []
const EMPTY_SHUTTERS: PlanShutter[] = []
const EMPTY_LABELS: PlanLabel[] = []
const EMPTY_EMOJIS: PlanEmoji[] = []
const EMPTY_DECORS: PlanDecor[] = []
const EMPTY_NAMES: string[] = []
const EMPTY_LINKS: Record<string, string> = {}

/** Les couches du toit et celles des pièces : le toit est caché, les pièces se voient. */
const ROOF_LAYERS = ['plan-toit']
const ROOM_LAYERS = ['plan-pieces', 'plan-cloisons']

/**
 * Les props complétées et réduites à ce que la carte montre et permet : une lampe à placer ne se voit qu'en modification ; hors modification, plus de déplacement ni de réglage
 * (choisir une caméra et toucher une lampe restent).
 */
const resolve = (given: MapPlanProps, editing: boolean, hoveredCameraId: string): ResolvedProps => {
  const lamps = given.lamps ?? EMPTY_LAMPS
  const base: ResolvedProps = {
    ...given,
    cameras: given.cameras ?? EMPTY_CAMERAS,
    plugs: given.plugs ?? EMPTY_PLUGS,
    acs: given.acs ?? EMPTY_ACS,
    shutters: given.shutters ?? EMPTY_SHUTTERS,
    labels: given.labels ?? EMPTY_LABELS,
    emojis: given.emojis ?? EMPTY_EMOJIS,
    decors: given.decors ?? EMPTY_DECORS,
    lamps,
    hoveredCameraId,
    // Un clic sur une caméra la choisit (`onSelectCamera`) ; son double clic ouvre sa page (`onOpenCamera`, hors modification).
    onOpenCamera: editing ? undefined : given.onOpenCamera,
    // Hors modification, un clic sur une climatisation ouvre la page des climatisations (`onOpenAc`) ; en modification, elle se déplace et un clic ne fait rien.
    onToggleAc: !editing ? (given.onSelectAc ?? given.onOpenAc) : undefined,
    onOpenAc: !editing && given.onSelectAc ? given.onOpenAc : undefined,
    // Un clic sur la prise la choisit (`onSelectPlug`), son double clic ouvre sa page (`onOpenPlug`) ; en modification, on la déplace et un clic ne fait rien.
    onTogglePlug: editing ? undefined : given.onSelectPlug,
    onOpenPlug: editing ? undefined : given.onOpenPlug,
    // Hors modification, un clic sur un volet l'ordonne (le descend ou le monte) ; en modification, on le déplace et un clic ne fait rien.
    onToggleShutter: editing ? undefined : (given.onSelectShutter ?? given.onToggleShutter),
    onOpenShutter: editing || !given.onSelectShutter ? undefined : given.onOpenShutter,
    // Un clic sur la box (une icône seule cliquable) la choisit, son double clic ouvre sa page ; en modification, on la déplace.
    onToggleDecor: editing ? undefined : given.onSelectDecor,
    onOpenDecor: editing ? undefined : given.onOpenDecor,
    // Un clic sur l'emoji d'un clip le choisit, son double clic l'ouvre ; en modification, on le déplace et un clic ne fait rien.
    onToggleEmoji: editing ? undefined : given.onToggleEmoji,
    onOpenEmoji: editing ? undefined : given.onOpenEmoji,
    selectedCameraId: given.selectedCameraId ?? '',
    cameraNames: given.cameraNames ?? EMPTY_NAMES,
    links: given.links ?? EMPTY_LINKS,
  }
  if (editing) return base
  return {
    ...base,
    onMoveCamera: undefined,
    onAdjustCamera: undefined,
    onMoveLamp: undefined,
    onMoveAc: undefined,
    onMoveShutter: undefined,
    onMoveLabel: undefined,
    onMoveEmoji: undefined,
    onMoveDecor: undefined,
    onMovePlug: undefined,
    onLink: undefined,
  }
}

/** Du haut du cadre au bas de l'écran, moins la marge de la page. */
const fitHeight = (element: HTMLElement) => {
  const top = element.getBoundingClientRect().top + window.scrollY
  element.style.height = `${window.innerHeight - top - FILL_BOTTOM_GAP}px`
}

/** Les éléments vivants d'après les props. */
const liveData = (props: ResolvedProps): LiveData => ({
  cage: props.cage,
  offsets: props.offsets,
  tiles: props.tiles ?? null,
  garage: props.garage ?? null,
  gates: props.gates,
  cameras: props.cameras,
  trees: props.trees,
  hedges: props.hedges,
  lamps: props.lamps,
  plugs: props.plugs,
  acs: props.acs,
  shutters: props.shutters,
  labels: props.labels,
  emojis: props.emojis,
  decors: props.decors,
  selectedCameraId: props.selectedCameraId,
  hoveredCameraId: props.hoveredCameraId,
  canAdjustCameras: Boolean(props.onAdjustCamera),
})

/**
 * Une carte (MapLibre GL) centrée sur la maison, tournée pour que la maison soit droite à l'écran : deux fonds au choix (photo aérienne, Plan IGN en vecteur, net à tout zoom),
 * et le plan de la maison dessiné par la carte elle-même, en longitude et latitude : il ne glisse pas pendant un zoom. Le toit est caché : on voit les pièces, les cloisons, les
 * caméras et les lampes. Les caméras, lampes, climatisations, volets, étiquettes, emoji, icônes seules et prise se prennent à la souris en mode modification ; le reste de la carte se déplace. « Recentrer » ramène la vue de départ.
 */
const MapPlan = (given: MapPlanProps) => {
  // Le plan ne se modifie que si on l'a demandé : sinon seuls les clics sur une caméra (son champ de vision) ou une lampe (l'allumer) restent.
  const [editing, setEditing] = useState(false)
  // L'ampoule survolée ou touchée, dont le nom s'écrit en bas de la carte.
  const [activeLamp, setActiveLamp] = useState('')
  // La climatisation survolée ou touchée, dont le texte s'écrit en bas de la carte.
  const [activeAc, setActiveAc] = useState('')
  // Les types d'icônes montrés (toutes au départ) : Clim, Caméra, Lumière, Volet, Chauffage, Clip (décochée au départ).
  const [shown, setShown] = useState<Record<string, boolean>>({
    ac: true,
    camera: true,
    lamp: true,
    shutter: true,
    plug: true,
    emoji: false,
  })
  // La caméra survolée : son champ de vision s'affiche tant que la souris est dessus.
  const [hoveredCamera, setHoveredCamera] = useState('')
  // Téléphone : le petit menu des filtres est ouvert ou fermé (fermé au départ).
  const [filtersOpen, setFiltersOpen] = useState(false)
  // La prise (le chauffage) survolée : son nom s'écrit en bas de la carte.
  const [hoveredPlug, setHoveredPlug] = useState('')
  // Le volet survolé ou touché, dont le texte s'écrit en bas de la carte.
  const [activeShutter, setActiveShutter] = useState('')
  const props = resolve(
    {
      ...given,
      onHoverLamp: setActiveLamp,
      onHoverAc: setActiveAc,
      onHoverShutter: setActiveShutter,
      onHoverCamera: setHoveredCamera,
      onHoverPlug: setHoveredPlug,
    },
    editing,
    hoveredCamera,
  )
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const paletteRef = useRef<Palette | null>(null)
  // Le style et la photo aérienne sont chargés : le plan peut s'ajouter.
  const [styleReady, setStyleReady] = useState(false)
  // Le dernier message d'erreur de la carte (style, tuiles, cadastre), affiché sous les commandes : sans lui, une carte noire ne dit rien.
  const [problem, setProblem] = useState('')
  // Les props les plus récentes, lues par les gestes et à la création des couches (posés une fois).
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })
  useEffect(() => {
    const element = container.current
    // Garde pour TypeScript : le conteneur est toujours posé quand l'effet tourne.
    /* v8 ignore next */
    if (!element) return
    const map = new MapLibreMap({
      container: element,
      style: { version: 8, sources: {}, layers: [] },
      center: CENTER_LNG_LAT,
      zoom: MAP_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      bearing: MAP_ROTATION_DEG,
      pitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: false,
      doubleClickZoom: false,
    })
    map.touchZoomRotate.disableRotation()
    mapRef.current = map
    map.on('error', (event) => setProblem(event.error?.message ?? 'Erreur de la carte'))

    // La photo aérienne (le seul fond) puis le plan s'ajoutent au style vide une fois celui-ci chargé.
    map.on('style.load', () => {
      try {
        const palette = readPalette()
        paletteRef.current = palette
        map.addSource(SATELLITE.id, {
          type: 'raster',
          tiles: [SATELLITE.tiles],
          tileSize: RASTER_TILE_SIZE,
          maxzoom: RASTER_MAX_ZOOM,
          attribution: ATTRIBUTION,
        })
        map.addLayer({ id: SATELLITE.id, type: 'raster', source: SATELLITE.id })
        // Le plan de la maison, par-dessus tout.
        const current = latest.current
        const live = liveFeatures(liveData(current), palette)
        addMapIcons(map, palette)
        addStatusDots(map, palette)
        watchDynamicImages(map)
        addPlanLayers(map, palette, live.shapes, live.points, staticFeatures())
        setStyleReady(true)
      } catch (error) {
        setProblem(error instanceof Error ? error.message : String(error))
      }
    })
    const detach = attachEditing(map, () => latest.current)

    return () => {
      detach()
      mapRef.current = null
      setStyleReady(false)
      map.remove()
    }
  }, [])

  // Téléphone (`fill`) : la carte prend toute la place qui reste, du haut de son cadre au bas de l'écran (moins la marge de la page). Mesuré, pas deviné : la hauteur de la barre du haut varie.
  const fill = Boolean(given.fill)
  useEffect(() => {
    const element = container.current
    if (!fill || !element) return
    const fit = () => fitHeight(element)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [fill])

  // La Home reste montée (cachée) quand on change d'onglet : quand elle redevient visible, la carte reprend la taille de son cadre (et, sur téléphone, sa hauteur est remesurée à sa vraie place).
  useEffect(() => {
    const element = container.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (fill) fitHeight(element)
      mapRef.current?.resize()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [fill])

  // Une vue imposée par le parent (par exemple quand on choisit une caméra) : la carte s'y place d'un coup, à chaque fois que la vue demandée change.
  const focus = given.focusView
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focus) return
    map.jumpTo({ center: [focus.lng, focus.lat], zoom: focus.zoom, bearing: focus.bearing, pitch: 0 })
    // On suit les quatre nombres de la vue (pas l'objet, recréé à chaque rendu par le parent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.lat, focus?.lng, focus?.zoom, focus?.bearing])

  // Où est, à l'écran, l'objet choisi (caméra, prise, clim, volet, emoji de clip) : le parent y tire une ligne jusqu'à son bloc. Relu à chaque mouvement de la carte.
  const anchorCallback = given.onAnchor
  const anchorCamera =
    props.cameras.find((camera) => camera.id === props.selectedCameraId) ??
    props.plugs.find((plug) => plug.id === given.selectedPlugId) ??
    props.acs.find((ac) => ac.id === given.selectedAcId) ??
    props.shutters.find((item) => item.id === given.selectedShutterId) ??
    props.emojis.find((item) => item.id === given.selectedEmojiId) ??
    props.decors.find((item) => item.id === given.selectedDecorId)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady || !anchorCallback) return
    if (!anchorCamera) {
      anchorCallback(null)
      return
    }
    const update = () => {
      const camera = map.project(planToLngLat(anchorCamera.x, anchorCamera.y))
      anchorCallback({ x: Math.round(camera.x), y: Math.round(camera.y) })
    }
    update()
    map.on('move', update)
    return () => {
      map.off('move', update)
    }
    // On suit l'identifiant et la position de la caméra (pas l'objet, recréé à chaque rendu).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorCallback, anchorCamera?.id, anchorCamera?.x, anchorCamera?.y, styleReady])

  // La ligne bleue de l'objet choisi au bord du bloc du parent : un calque de la carte (sous les icônes), relue à chaque mouvement.
  const linkBox = given.linkBox
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    const source = map.getSource(LINK_SOURCE) as GeoJSONSource | undefined
    if (!source) return
    const empty = { type: 'FeatureCollection' as const, features: [] }
    if (!anchorCamera || !linkBox) {
      source.setData(empty)
      return
    }
    const from = planToLngLat(anchorCamera.x, anchorCamera.y)
    const update = () => {
      const icon = map.project(from)
      const y = Math.min(Math.max(icon.y, linkBox.top), linkBox.top + linkBox.height)
      const end = map.unproject([linkBox.left, y])
      source.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [from, [end.lng, end.lat]] } }],
      })
    }
    update()
    map.on('move', update)
    return () => {
      map.off('move', update)
    }
    // On suit l'identifiant et la position de l'objet et les nombres du bloc (pas les objets, recréés à chaque rendu).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorCamera?.id, anchorCamera?.x, anchorCamera?.y, linkBox?.left, linkBox?.top, linkBox?.height, styleReady])

  // Les cases Clim, Caméra, Lumière, Volet : les calques du type se cachent, et sa zone de saisie sort du filtre (une icône cachée ne se prend plus).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    for (const filter of FILTERS)
      for (const id of filter.layers) map.setLayoutProperty(id, 'visibility', shown[filter.id] ? 'visible' : 'none')
    const kinds = [...ALWAYS_HIT, ...FILTERS.filter((filter) => shown[filter.id]).map((filter) => filter.hit)]
    map.setFilter('plan-saisie', ['in', ['get', 'kind'], ['literal', kinds]])
  }, [shown, styleReady])

  // Le toit est caché : les pièces, les cloisons et les lampes sont dessous.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    // Les couches existent dès que le style est prêt (addPlanLayers passe avant styleReady).
    for (const id of ROOF_LAYERS) map.setLayoutProperty(id, 'visibility', 'none')
    for (const id of ROOM_LAYERS) map.setLayoutProperty(id, 'visibility', 'visible')
  }, [styleReady])

  // Les éléments du plan ont changé (déplacés, choisis, allumés) : les données de la carte suivent.
  useEffect(() => {
    const map = mapRef.current
    const palette = paletteRef.current
    if (!map || !palette || !styleReady) return
    const live = liveFeatures(liveData(props), palette)
    ;(map.getSource(SHAPES_SOURCE) as GeoJSONSource | undefined)?.setData(live.shapes)
    ;(map.getSource(POINTS_SOURCE) as GeoJSONSource | undefined)?.setData(live.points)
  }, [props, styleReady])

  // Les murs de la maison ont été modifiés (les pièces, leurs murs) : la partie fixe suit.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    ;(map.getSource(STATIC_SOURCE) as GeoJSONSource | undefined)?.setData(staticFeatures(props.rooms ?? defaultRoomRects()))
  }, [props.rooms, styleReady])

  const lamp = props.lamps.find((item) => item.id === activeLamp)
  const ac = props.acs.find((item) => item.id === activeAc)
  const shutter = props.shutters.find((item) => item.id === activeShutter)
  // Le nom d'une caméra survolée : celui de la vraie caméra liée, sinon celui de l'icône du plan.
  const hoveredCameraItem = props.cameras.find((item) => item.id === hoveredCamera)
  const cameraName = hoveredCameraItem ? (props.links[hoveredCameraItem.id] ?? hoveredCameraItem.name) : ''
  const plugName = props.plugs.find((item) => item.id === hoveredPlug)?.name ?? ''
  const filterBoxes = FILTERS.map((filter) => (
    <Checkbox
      key={filter.id}
      label={filter.label}
      checked={shown[filter.id]}
      onChange={(checked) => setShown((current) => ({ ...current, [filter.id]: checked }))}
    />
  ))

  return (
    <div className={WRAPPER_CLASS}>
      <div ref={container} className={given.fill ? MAP_FILL_CLASS : MAP_CLASS} />
      <div className={LAYERS_CLASS}>
        {props.onLink && props.selectedCameraId ? (
          <Select
            label={LINK_LABEL}
            options={[{ value: '', label: LINK_NONE }, ...props.cameraNames.map((name) => ({ value: name, label: name }))]}
            value={props.links[props.selectedCameraId] ?? ''}
            onChange={(name) => props.onLink?.(props.selectedCameraId, name)}
          />
        ) : null}
        {problem ? <p className={PROBLEM_CLASS}>{problem}</p> : null}
      </div>
      {lamp ? <p className={LAMP_LABEL_CLASS}>{bulbLabel(lamp.name, lamp.on, lamp.reachable, lamp.brightness)}</p> : null}
      {ac ? <p className={LAMP_LABEL_CLASS}>{ac.label}</p> : null}
      {shutter ? <p className={LAMP_LABEL_CLASS}>{shutter.label}</p> : null}
      {cameraName ? <p className={LAMP_LABEL_CLASS}>{cameraName}</p> : null}
      {plugName ? <p className={LAMP_LABEL_CLASS}>{plugName}</p> : null}
      <div className={ACTIONS_CLASS}>
        {/* Pas de modification sur téléphone (`fill`) : on y regarde la carte, on ne la modifie pas. */}
        {given.fill ? null : (
          <Button variant={editing ? 'active' : 'default'} aria-pressed={editing} onClick={() => setEditing((on) => !on)}>
            {EDIT_LABEL}
          </Button>
        )}
        {given.fill ? (
          <div className={FILTERS_MENU_WRAPPER_CLASS}>
            <Button variant={filtersOpen ? 'active' : 'default'} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
              {FILTERS_LABEL}
            </Button>
            {filtersOpen ? <div className={FILTERS_MENU_CLASS}>{filterBoxes}</div> : null}
          </div>
        ) : (
          <div className={FILTERS_BAR_CLASS}>{filterBoxes}</div>
        )}
      </div>
    </div>
  )
}

export default MapPlan
