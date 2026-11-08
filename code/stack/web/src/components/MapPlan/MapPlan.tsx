import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
// Le travailleur de MapLibre (décodage des tuiles) est un fichier à part : Vite le copie dans les ressources et donne son adresse (sans cela MapLibre le cherche à côté du script, où il n'est pas).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Button, Select, Tabs, type PlanCamera, type PlanLamp, type PlanPlug } from '@house/ui'
import {
  ATTRIBUTION,
  BASES,
  BASES_LABEL,
  DEFAULT_BASE,
  EDIT_LABEL,
  LAMP_LABEL_CLASS,
  LINK_LABEL,
  LINK_NONE,
  LAYERS_CLASS,
  MAP_CENTER,
  MAP_CLASS,
  FIT_EXTRA_ZOOM,
  FIT_PADDING,
  MAP_MAX_ZOOM,
  MAP_ROTATION_DEG,
  MAP_ZOOM,
  PROBLEM_CLASS,
  RASTER_MAX_ZOOM,
  RASTER_TILE_SIZE,
  ACTIONS_CLASS,
  RECENTER_LABEL,
  VECTOR_STYLE_URL,
  WRAPPER_CLASS,
  type BaseId,
} from './constants'
import { attachEditing } from './edit'
import { liveFeatures, readPalette, staticFeatures, type LiveData, type Palette } from './features'
import { bulbLabel } from './helpers'
import { lampBounds } from './projection'
import { addPlanLayers, POINTS_SOURCE, SHAPES_SOURCE } from './layers'
import type { MapPlanProps, ResolvedProps } from './types'

setWorkerUrl(workerUrl)

/** Le centre en [longitude, latitude], l'ordre de MapLibre. */
const CENTER_LNG_LAT: [number, number] = [MAP_CENTER[1], MAP_CENTER[0]]

const EMPTY_CAMERAS: PlanCamera[] = []
const EMPTY_LAMPS: PlanLamp[] = []
const EMPTY_PLUGS: PlanPlug[] = []
const EMPTY_NAMES: string[] = []
const EMPTY_LINKS: Record<string, string> = {}

/** Les couches du toit et celles des pièces : l'une se cache quand l'autre se montre. */
const ROOF_LAYERS = ['plan-toit']
const ROOM_LAYERS = ['plan-pieces', 'plan-pieces-trait', 'plan-cloisons', 'plan-claustras']

/**
 * Les props complétées et réduites à ce que la carte montre et permet : la carte des lumières n'a ni caméras ni prise ; une lampe d'intérieur ne se voit que toit caché
 * (carte des caméras), une lampe à placer qu'en modification ; hors modification, plus de déplacement ni de réglage (choisir une caméra et toucher une lampe restent) ;
 * en modification de la carte des lumières, seules les lampes se déplacent.
 */
const resolve = (given: MapPlanProps, editing: boolean): ResolvedProps => {
  const mode = given.mode ?? 'cameras'
  const lights = mode === 'lights'
  const lamps = (given.lamps ?? EMPTY_LAMPS).filter((lamp) => (editing || !lamp.waiting) && (lights || !lamp.indoor))
  const base: ResolvedProps = {
    ...given,
    mode,
    cameras: lights ? EMPTY_CAMERAS : (given.cameras ?? EMPTY_CAMERAS),
    plugs: lights ? EMPTY_PLUGS : (given.plugs ?? EMPTY_PLUGS),
    lamps,
    selectedCameraId: given.selectedCameraId ?? '',
    cameraNames: given.cameraNames ?? EMPTY_NAMES,
    links: given.links ?? EMPTY_LINKS,
    selectedTreeId: given.selectedTreeId ?? '',
    selectedHedgeId: given.selectedHedgeId ?? '',
  }
  if (editing && !lights) return base
  return {
    ...base,
    onMoveCamera: undefined,
    onAdjustCamera: undefined,
    onMoveTree: undefined,
    onResizeTree: undefined,
    onSelectTree: undefined,
    onMoveHedge: undefined,
    onSelectHedge: undefined,
    onMoveCage: undefined,
    onMoveOffset: undefined,
    onMoveLamp: editing ? base.onMoveLamp : undefined,
    onMovePlug: undefined,
    onLink: undefined,
    selectedTreeId: '',
    selectedHedgeId: '',
  }
}

/** Les éléments vivants d'après les props. */
const liveData = (props: ResolvedProps): LiveData => ({
  cage: props.cage,
  offsets: props.offsets,
  gates: props.gates,
  cameras: props.cameras,
  trees: props.trees,
  hedges: props.hedges,
  lamps: props.lamps,
  plugs: props.plugs,
  selectedCameraId: props.selectedCameraId,
  selectedTreeId: props.selectedTreeId,
  selectedHedgeId: props.selectedHedgeId,
  canEditHedges: Boolean(props.onMoveHedge),
  canResizeTrees: Boolean(props.onResizeTree),
  canAdjustCameras: Boolean(props.onAdjustCamera),
})

/**
 * Une carte (MapLibre GL) centrée sur la maison, tournée pour que la maison soit droite à l'écran : deux fonds au choix (photo aérienne, Plan IGN en vecteur, net à tout zoom),
 * et le plan de la maison dessiné par la carte elle-même, en longitude et latitude : il ne glisse pas pendant un zoom. Deux modes, même dessin : les caméras (la carte de la
 * mosaïque) ou les lampes (l'onglet Lumière). « Cacher le toit » montre les pièces, les cloisons et les lampes. Les caméras, lampes, arbres, haies et prise se prennent à la
 * souris en mode modification ; le reste de la carte se déplace. « Recentrer » ramène la vue de départ.
 */
const MapPlan = (given: MapPlanProps) => {
  const lights = given.mode === 'lights'
  // Le plan ne se modifie que si on l'a demandé : sinon seuls les clics sur une caméra (son champ de vision) ou une lampe (l'allumer) restent.
  const [editing, setEditing] = useState(false)
  // Le toit est caché sur la carte des lumières (les pièces et les lampes sont dessous), visible sur celle des caméras.
  const roofHidden = lights
  // L'ampoule survolée ou touchée, dont le nom s'écrit en bas de la carte.
  const [activeLamp, setActiveLamp] = useState('')
  const props = resolve({ ...given, onHoverLamp: setActiveLamp }, editing)
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const paletteRef = useRef<Palette | null>(null)
  const [base, setBase] = useState<BaseId>(DEFAULT_BASE)
  // Le style vectoriel et les fonds en images sont chargés : le fond choisi peut s'appliquer.
  const [styleReady, setStyleReady] = useState(false)
  // Le dernier message d'erreur de la carte (style, tuiles, cadastre), affiché sous les commandes : sans lui, une carte noire ne dit rien.
  const [problem, setProblem] = useState('')
  // Les couches du style vectoriel, à cacher quand un fond en images est choisi (avec la visibilité que le style leur donne : certaines sont cachées par construction).
  const vectorLayers = useRef<{ id: string; visibility: 'visible' | 'none' }[]>([])
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
      style: VECTOR_STYLE_URL,
      center: CENTER_LNG_LAT,
      zoom: MAP_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      bearing: MAP_ROTATION_DEG,
      pitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: false,
    })
    map.touchZoomRotate.disableRotation()
    map.addControl(new NavigationControl({ showCompass: false }), 'top-left')
    mapRef.current = map
    map.on('error', (event) => setProblem(event.error?.message ?? 'Erreur de la carte'))

    // La photo aérienne et le plan s'ajoutent au style vectoriel une fois celui-ci chargé ; le fond choisi se règle ensuite par la visibilité des couches.
    map.on('style.load', () => {
      try {
        const palette = readPalette()
        paletteRef.current = palette
        vectorLayers.current = map.getStyle().layers.map((layer) => ({
          id: layer.id,
          visibility: layer.layout?.visibility === 'none' ? ('none' as const) : ('visible' as const),
        }))
        for (const entry of BASES) {
          if (!entry.tiles) continue
          map.addSource(entry.id, {
            type: 'raster',
            tiles: [entry.tiles],
            tileSize: RASTER_TILE_SIZE,
            maxzoom: RASTER_MAX_ZOOM,
            attribution: ATTRIBUTION,
          })
          map.addLayer({ id: entry.id, type: 'raster', source: entry.id, layout: { visibility: 'none' } })
        }
        // Le plan de la maison, par-dessus tout.
        const current = latest.current
        const live = liveFeatures(liveData(current), palette)
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

  // Le fond choisi : les couches du vecteur ou l'une des deux images.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    for (const { id, visibility } of vectorLayers.current) map.setLayoutProperty(id, 'visibility', base === 'vector' ? visibility : 'none')
    for (const entry of BASES) {
      if (entry.tiles && map.getLayer(entry.id)) map.setLayoutProperty(entry.id, 'visibility', entry.id === base ? 'visible' : 'none')
    }
  }, [base, styleReady])

  // Carte des lumières : la vue cadre toutes les lampes, une fois qu'elles sont là (elles arrivent après la carte).
  const fitted = useRef(false)
  const fitLamps = (map: MapLibreMap): boolean => {
    const bounds = lampBounds(props.lamps)
    if (!bounds) return false
    const camera = map.cameraForBounds(bounds, { padding: FIT_PADDING, bearing: MAP_ROTATION_DEG })
    if (!camera) return false
    // Le cadrage exact, un cran de zoom en plus (les lampes du bord se rejoignent en glissant).
    map.jumpTo({ center: camera.center, zoom: Math.min(MAP_MAX_ZOOM, camera.zoom! + FIT_EXTRA_ZOOM), bearing: MAP_ROTATION_DEG, pitch: 0 })
    return true
  }
  useEffect(() => {
    const map = mapRef.current
    if (!map || !lights || fitted.current) return
    fitted.current = fitLamps(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lights, props.lamps, styleReady])

  // Le toit ou les pièces : l'un se cache quand l'autre se montre.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    // Les couches existent dès que le style est prêt (addPlanLayers passe avant styleReady).
    for (const id of ROOF_LAYERS) map.setLayoutProperty(id, 'visibility', roofHidden ? 'none' : 'visible')
    for (const id of ROOM_LAYERS) map.setLayoutProperty(id, 'visibility', roofHidden ? 'visible' : 'none')
  }, [roofHidden, styleReady])

  // Les éléments du plan ont changé (déplacés, choisis, allumés) : les données de la carte suivent.
  useEffect(() => {
    const map = mapRef.current
    const palette = paletteRef.current
    if (!map || !palette || !styleReady) return
    const live = liveFeatures(liveData(props), palette)
    ;(map.getSource(SHAPES_SOURCE) as GeoJSONSource | undefined)?.setData(live.shapes)
    ;(map.getSource(POINTS_SOURCE) as GeoJSONSource | undefined)?.setData(live.points)
  }, [props, styleReady])

  const lamp = props.lamps.find((item) => item.id === activeLamp)

  return (
    <div className={WRAPPER_CLASS}>
      <div ref={container} className={MAP_CLASS} />
      <div className={LAYERS_CLASS}>
        <Tabs label={BASES_LABEL} options={BASES.map(({ id, label }) => ({ id, label }))} value={base} onChange={setBase} />
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
      <div className={ACTIONS_CLASS}>
        <Button
          onClick={() => {
            const map = mapRef.current
            if (map && lights && fitLamps(map)) return
            map?.jumpTo({
              center: CENTER_LNG_LAT,
              zoom: MAP_ZOOM,
              bearing: MAP_ROTATION_DEG,
              pitch: 0,
            })
          }}
        >
          {RECENTER_LABEL}
        </Button>
        <Button variant={editing ? 'active' : 'default'} aria-pressed={editing} onClick={() => setEditing((on) => !on)}>
          {EDIT_LABEL}
        </Button>
      </div>
    </div>
  )
}

export default MapPlan
