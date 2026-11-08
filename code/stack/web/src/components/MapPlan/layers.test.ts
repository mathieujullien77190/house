import type { FeatureCollection } from 'geojson'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Palette } from './features'
import { addPlanLayers, INTERACTIVE_LAYERS, PLAN_LAYERS, POINTS_SOURCE, SHAPES_SOURCE, STATIC_SOURCE } from './layers'

const palette: Palette = { accent: 'A', bg: 'B', fg: 'F', muted: 'M', orange: 'O', green: 'G', danger: 'D' }
const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }

describe('addPlanLayers', () => {
  it('ajoute les trois sources puis toutes les couches, dans l’ordre', () => {
    const addSource = vi.fn()
    const addLayer = vi.fn()
    addPlanLayers({ addSource, addLayer } as unknown as MapLibreMap, palette, empty, empty, empty)
    expect(addSource.mock.calls.map(([id]) => id)).toEqual([STATIC_SOURCE, SHAPES_SOURCE, POINTS_SOURCE])
    expect(addLayer.mock.calls.map(([layer]) => layer.id)).toEqual([...PLAN_LAYERS])
  })
  it('les couches saisissables existent toutes', () => {
    for (const id of INTERACTIVE_LAYERS) expect(PLAN_LAYERS).toContain(id)
  })
  it('les largeurs de trait suivent le zoom (interpolation exponentielle)', () => {
    const addLayer = vi.fn()
    addPlanLayers({ addSource: vi.fn(), addLayer } as unknown as MapLibreMap, palette, empty, empty, empty)
    const hedges = addLayer.mock.calls.map(([l]) => l).find((l) => l.id === 'plan-haies')
    const width = hedges.paint['line-width']
    expect(width.slice(0, 3)).toEqual(['interpolate', ['exponential', 2], ['zoom']])
    expect(width[6]).toBeGreaterThan(width[4])
  })
})
