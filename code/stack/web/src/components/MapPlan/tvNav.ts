// La navigation de la carte à la télécommande (mode télé, `?tv=1`) : les flèches passent d'un appareil à celui qui est dans leur direction (un cadre jaune montre où on est),
// OK fait comme un clic sur le bureau (choisir une caméra, une clim, un volet, la prise ; allumer ou éteindre une lampe), un second OK sur l'appareil choisi fait comme un double clic
// (ouvrir sa page). Retour ou Échap : plus rien n'est choisi. Pas de souris, pas de curseur.
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { disabled, HOVER_LAYERS, type EditContext } from './edit'
import { HOVER_NONE } from './layers'

const RING_SOURCE = 'plan-tv-focus'
const RING_LAYER = 'plan-tv-focus'
/** Les appareils qu'on peut atteindre : ceux sur lesquels un clic fait quelque chose sur le bureau. */
const KINDS = ['camera-hit', 'lamp-hit', 'ac-hit', 'shutter-hit', 'plug-hit', 'emoji-hit', 'decor-hit']
const KEYS: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
/** En dessous de cette avance (pixels) dans la direction, un appareil n'est pas « devant ». */
const MIN_ALONG = 4
/** Un appareil de côté compte plus loin : l'écart sur l'autre axe pèse ce nombre de fois son avance. */
const ACROSS_WEIGHT = 2

interface Target {
  kind: string
  id: string
  x: number
  y: number
  lng: number
  lat: number
}

export const attachTvNavigation = (map: MapLibreMap, context: () => EditContext): (() => void) => {
  let current: { kind: string; id: string } | null = null
  // L'appareil choisi par un OK : un second OK dessus l'ouvre.
  let chosen = ''
  let hovered = ''

  /** Les appareils atteignables, avec leur place à l'écran. */
  const targets = (): Target[] => {
    if (!map.getLayer('plan-saisie')) return []
    const seen = new Set<string>()
    const found: Target[] = []
    for (const feature of map.queryRenderedFeatures(undefined, { layers: ['plan-saisie'] })) {
      const properties = feature.properties
      const kind = String(properties?.kind)
      if (!KINDS.includes(kind) || disabled(properties, context())) continue
      if (kind === 'decor-hit' && properties?.clickable !== 1) continue
      const key = `${kind}:${String(properties?.id)}`
      if (seen.has(key) || feature.geometry.type !== 'Point') continue
      seen.add(key)
      const [lng, lat] = feature.geometry.coordinates as [number, number]
      const point = map.project([lng, lat])
      found.push({ kind, id: String(properties?.id), x: point.x, y: point.y, lng, lat })
    }
    return found
  }

  /** Le cadre jaune autour de l'appareil où on est (un cercle sur la carte, au-dessus des icônes). */
  const ring = (target: Target) => {
    if (!map.getSource(RING_SOURCE)) {
      map.addSource(RING_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: RING_LAYER,
        type: 'circle',
        source: RING_SOURCE,
        paint: { 'circle-radius': 30, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-width': 6, 'circle-stroke-color': '#facc15' },
      })
    }
    const source = map.getSource<GeoJSONSource>(RING_SOURCE)
    source?.setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [target.lng, target.lat] } }],
    })
  }

  /** Le rond de l'appareil passe en bleu pâle (comme au survol), le cadre jaune le suit. */
  const show = (target: Target) => {
    const [previous] = hovered.split(':')
    hovered = `${target.kind}:${target.id}`
    if (previous in HOVER_LAYERS && map.getLayer(HOVER_LAYERS[previous])) map.setFilter(HOVER_LAYERS[previous], HOVER_NONE)
    if (target.kind in HOVER_LAYERS && map.getLayer(HOVER_LAYERS[target.kind]))
      map.setFilter(HOVER_LAYERS[target.kind], ['all', ['==', ['get', 'kind'], target.kind], ['==', ['get', 'id'], target.id]])
    ring(target)
    current = { kind: target.kind, id: target.id }
  }

  /** L'appareil dans la direction demandée : le plus proche devant, en préférant celui qui est bien aligné. */
  const next = (from: Target, direction: 'left' | 'right' | 'up' | 'down', all: Target[]): Target | null => {
    let best: Target | null = null
    let bestScore = Infinity
    for (const target of all) {
      if (target.kind === from.kind && target.id === from.id) continue
      const dx = target.x - from.x
      const dy = target.y - from.y
      const along = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy
      if (along <= MIN_ALONG) continue
      const across = Math.abs(direction === 'left' || direction === 'right' ? dy : dx)
      const score = along + ACROSS_WEIGHT * across
      if (score < bestScore) {
        best = target
        bestScore = score
      }
    }
    return best
  }

  /** OK : comme un clic sur le bureau ; sur l'appareil déjà choisi, comme un double clic (ouvrir sa page). */
  const activate = (target: Target) => {
    const here = context()
    const key = `${target.kind}:${target.id}`
    if (key === chosen) {
      if (target.kind === 'camera-hit') here.onOpenCamera?.(target.id)
      else if (target.kind === 'ac-hit') here.onOpenAc?.(target.id)
      else if (target.kind === 'emoji-hit') here.onOpenEmoji?.(target.id)
      else if (target.kind === 'shutter-hit') here.onOpenShutter?.(target.id)
      else if (target.kind === 'decor-hit') here.onOpenDecor?.(target.id)
      else here.onOpenPlug?.(target.id)
      return
    }
    chosen = key
    if (target.kind === 'camera-hit') here.onSelectCamera?.(target.id)
    else if (target.kind === 'lamp-hit') {
      here.onToggleLamp?.(target.id)
      chosen = ''
    } else if (target.kind === 'plug-hit') here.onTogglePlug?.(target.id)
    else if (target.kind === 'shutter-hit') here.onToggleShutter?.(target.id)
    else if (target.kind === 'emoji-hit') here.onToggleEmoji?.(target.id)
    else if (target.kind === 'decor-hit') here.onToggleDecor?.(target.id)
    else here.onToggleAc?.(target.id)
  }

  /** Retour : plus rien n'est choisi (comme un clic à côté de tout sur le bureau). Rend vrai s'il y avait quelque chose à fermer. */
  const back = (): boolean => {
    const had = chosen !== ''
    chosen = ''
    const here = context()
    here.onSelectCamera?.('')
    // La Home ferme son bloc quand on appuie hors de lui.
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    return had
  }

  const keydown = (event: KeyboardEvent) => {
    // Un direct en grand est ouvert (`TvLive`) : la carte ne réagit plus.
    if (document.body.dataset.tvOverlay) return
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) return
    const direction = KEYS[event.key]
    if (direction) {
      const all = targets()
      if (all.length === 0) return
      const from = all.find((item) => current && item.kind === current.kind && item.id === current.id)
      if (!from) {
        // Première flèche : l'appareil le plus proche du centre de la carte.
        const canvas = map.getCanvas()
        const cx = canvas.clientWidth / 2
        const cy = canvas.clientHeight / 2
        show(all.reduce((best, item) => (Math.hypot(item.x - cx, item.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? item : best), all[0]))
      } else {
        const to = next(from, direction, all)
        if (to) show(to)
      }
      event.preventDefault()
      return
    }
    if (event.key === 'Enter') {
      const from = targets().find((item) => current && item.kind === current.kind && item.id === current.id)
      if (!from) return
      event.preventDefault()
      activate(from)
      return
    }
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault()
      back()
    }
  }

  /** Programme + / − de la télécommande : zoom avant / arrière de la carte (le cadre suit, il est posé sur la carte). */
  const zoom = (direction: number) => {
    if (document.body.dataset.tvOverlay) return
    if (direction > 0) map.zoomIn({ duration: 250 })
    else map.zoomOut({ duration: 250 })
  }
  const channelKeys: Record<string, number> = { ChannelUp: 1, PageUp: 1, ChannelDown: -1, PageDown: -1 }
  const zoomKey = (event: KeyboardEvent) => {
    if (event.key in channelKeys) {
      event.preventDefault()
      zoom(channelKeys[event.key])
    }
  }

  window.addEventListener('keydown', keydown, true)
  window.addEventListener('keydown', zoomKey, true)
  // L'application de la télé demande si Retour a quelque chose à fermer avant de quitter, et passe le zoom des touches Programme.
  const hooks = window as unknown as { houseTvBack?: () => boolean; houseTvZoom?: (direction: number) => void }
  hooks.houseTvBack = back
  hooks.houseTvZoom = zoom
  return () => {
    window.removeEventListener('keydown', keydown, true)
    window.removeEventListener('keydown', zoomKey, true)
    delete hooks.houseTvBack
    delete hooks.houseTvZoom
  }
}
