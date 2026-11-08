import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
// Le travailleur de MapLibre (décodage des tuiles) est un fichier à part : Vite le copie dans les ressources et donne son adresse (sans cela MapLibre le cherche à côté du script, où il n'est pas).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Button, Select, Tabs } from '@house/ui'
import {
  ATTRIBUTION,
  BASES,
  BASES_LABEL,
  DEFAULT_BASE,
  EDIT_LABEL,
  LINK_LABEL,
  LINK_NONE,
  LAYERS_CLASS,
  MAP_CENTER,
  MAP_CLASS,
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
import { addPlanLayers, POINTS_SOURCE, SHAPES_SOURCE } from './layers'
import type { MapPlanProps } from './types'

setWorkerUrl(workerUrl)

/** Le centre en [longitude, latitude], l'ordre de MapLibre. */
const CENTER_LNG_LAT: [number, number] = [MAP_CENTER[1], MAP_CENTER[0]]

/** Le plan sans ses moyens de modification : plus de déplacement ni de réglage, plus de choix d'arbre ou de haie ; choisir une caméra (voir son champ de vision) reste. */
const readOnly = (props: MapPlanProps): MapPlanProps => ({
  ...props,
  onMoveCamera: undefined,
  onAdjustCamera: undefined,
  onMoveTree: undefined,
  onResizeTree: undefined,
  onSelectTree: undefined,
  onMoveHedge: undefined,
  onSelectHedge: undefined,
  onMoveCage: undefined,
  onMoveOffset: undefined,
  onMoveLamp: undefined,
  onMovePlug: undefined,
  onLink: undefined,
  selectedTreeId: '',
  selectedHedgeId: '',
})

/** Les éléments vivants d'après les props. */
const liveData = (props: MapPlanProps): LiveData => ({
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
 * Une carte (MapLibre GL) centrée sur la maison, tournée pour que la maison soit droite à l'écran : trois fonds au choix (Plan IGN en images, photo aérienne,
 * Plan IGN en vecteur, net à tout zoom), et le plan de la maison dessiné par la carte elle-même, en longitude et latitude : il ne glisse pas
 * pendant un zoom. Les caméras, arbres, haies, lampe et prise se prennent à la souris ; le reste de la carte se déplace. « Recentrer » ramène la vue de départ.
 */
const MapPlan = (given: MapPlanProps) => {
  // Le plan ne se modifie que si on l'a demandé : sinon seuls les clics sur une caméra (son champ de vision) restent.
  const [editing, setEditing] = useState(false)
  const props = editing ? given : readOnly(given)
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

  // Les éléments du plan ont changé (déplacés, choisis, allumés) : les données de la carte suivent.
  useEffect(() => {
    const map = mapRef.current
    const palette = paletteRef.current
    if (!map || !palette || !styleReady) return
    const live = liveFeatures(liveData(props), palette)
    ;(map.getSource(SHAPES_SOURCE) as GeoJSONSource | undefined)?.setData(live.shapes)
    ;(map.getSource(POINTS_SOURCE) as GeoJSONSource | undefined)?.setData(live.points)
  }, [props, styleReady])

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
      <div className={ACTIONS_CLASS}>
        <Button onClick={() => mapRef.current?.jumpTo({ center: CENTER_LNG_LAT, zoom: MAP_ZOOM, bearing: MAP_ROTATION_DEG, pitch: 0 })}>
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
