import type { Map as MapLibreMap } from 'maplibre-gl'
import {
  addMapIcons,
  addStatusDots,
  AC_IMAGE,
  CAMERA_DOT_MISSING_IMAGE,
  CAMERA_DOT_OFF_IMAGE,
  CAMERA_DOT_ON_IMAGE,
  CAMERA_IMAGE,
  SHUTTER_DOT_CLOSED_IMAGE,
  SHUTTER_DOT_OPEN_IMAGE,
  HEATPUMP_IMAGE,
  ROUTER_IMAGE,
  AC_HOVER_IMAGE,
  CAMERA_HOVER_IMAGE,
  PLUG_HOVER_IMAGE,
  SHUTTER_CLOSED_HOVER_IMAGE,
  SHUTTER_OPEN_HOVER_IMAGE,
  EMOJI_PREFIX,
  LAMP_HOVER_PREFIX,
  LAMP_PREFIX,
  PLUG_IMAGE,
  SHUTTER_CLOSED_IMAGE,
  SHUTTER_OPEN_IMAGE,
  TEMPERATURE_PREFIX,
  watchDynamicImages,
} from './icons'

const colors = { bg: '#fff', fg: '#000', accent: '#00f', danger: '#f00', orange: '#fa0', muted: '#888', green: '#0f0' }

/** Un contexte 2D factice : chaque méthode est un espion, getImageData rend un marqueur. */
const fakeContext = () => ({
  scale: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({
    actualBoundingBoxLeft: 1,
    actualBoundingBoxRight: 20,
    actualBoundingBoxAscent: 10,
    actualBoundingBoxDescent: 2,
  })),
  getImageData: vi.fn(() => ({ marker: 'image' })),
})

/** Une carte factice : garde le gestionnaire de `styleimagemissing` et les images ajoutées. */
const fakeMap = () => {
  const images = new Set<string>()
  const handlers = new Map<string, (event: { id: string }) => void>()
  const map = {
    hasImage: vi.fn((id: string) => images.has(id)),
    addImage: vi.fn((id: string) => {
      images.add(id)
    }),
    on: vi.fn((type: string, fn: (event: { id: string }) => void) => handlers.set(type, fn)),
  }
  return { map: map as unknown as MapLibreMap, raw: map, images, ask: (id: string) => handlers.get('styleimagemissing')?.({ id }) }
}

let context: ReturnType<typeof fakeContext> | null = null
let imageOutcome: 'load' | 'error' | 'error-black' = 'load'

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(value: string) {
    const fails = imageOutcome === 'error' || (imageOutcome === 'error-black' && value.includes('000000'))
    queueMicrotask(() => (fails ? this.onerror?.() : this.onload?.()))
  }
}

class FakePath2D {
  d: string
  constructor(d: string) {
    this.d = d
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  context = fakeContext()
  imageOutcome = 'load'
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => context) as unknown as HTMLCanvasElement['getContext'])
  vi.stubGlobal('Image', FakeImage)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('addMapIcons', () => {
  it('dessine chaque icône sur un rond et l’ajoute à la carte une fois prête', async () => {
    const { map, raw, images } = fakeMap()
    addMapIcons(map, colors)
    await flush()
    expect([...images].sort()).toEqual(
      [
        AC_IMAGE,
        AC_HOVER_IMAGE,
        CAMERA_IMAGE,
        CAMERA_HOVER_IMAGE,
        HEATPUMP_IMAGE,
        PLUG_IMAGE,
        PLUG_HOVER_IMAGE,
        ROUTER_IMAGE,
        SHUTTER_CLOSED_IMAGE,
        SHUTTER_CLOSED_HOVER_IMAGE,
        SHUTTER_OPEN_IMAGE,
        SHUTTER_OPEN_HOVER_IMAGE,
      ].sort(),
    )
    expect(raw.addImage).toHaveBeenCalledWith(CAMERA_IMAGE, { marker: 'image' }, { pixelRatio: 2 })
    // une image déjà présente n'est pas ajoutée deux fois
    raw.addImage.mockClear()
    addMapIcons(map, colors)
    await flush()
    expect(raw.addImage).not.toHaveBeenCalled()
  })

  it('sans canvas ou si l’image ne charge pas : aucune icône', async () => {
    const { map, raw } = fakeMap()
    context = null
    addMapIcons(map, colors)
    await flush()
    context = fakeContext()
    imageOutcome = 'error'
    addMapIcons(map, colors)
    await flush()
    expect(raw.addImage).not.toHaveBeenCalled()
    // la seconde image (l'icône noire) qui ne charge pas : aucune icône non plus
    imageOutcome = 'error-black'
    addMapIcons(map, colors)
    await flush()
    expect(raw.addImage).not.toHaveBeenCalled()
  })

  it('une carte retirée entre-temps ne casse rien', async () => {
    const { map, raw } = fakeMap()
    raw.addImage.mockImplementation(() => {
      throw new Error('carte retirée')
    })
    addMapIcons(map, colors)
    await flush()
    expect(raw.addImage).toHaveBeenCalled()
  })
})

describe('watchDynamicImages', () => {
  it('dessine à la demande l’étiquette de température, l’ampoule et l’emoji', () => {
    vi.stubGlobal('Path2D', FakePath2D)
    const { map, raw, ask } = fakeMap()
    watchDynamicImages(map)
    ask(`${TEMPERATURE_PREFIX}21,5°`)
    ask(`${LAMP_PREFIX}#ffa85a`)
    ask(`${LAMP_HOVER_PREFIX}#ffa85a`)
    ask(`${EMOJI_PREFIX}🦊`)
    expect(raw.addImage.mock.calls.map((call) => call[0])).toEqual(['temp-21,5°', 'lamp-#ffa85a', 'lamph-#ffa85a', 'emoji-🦊'])
    expect(context?.fillText).toHaveBeenCalledWith('21,5°', expect.any(Number), expect.any(Number))
    // l'ampoule dessine ses tracés (sans le fond transparent de l'icône)
    expect(context?.fill).toHaveBeenCalledWith(expect.any(FakePath2D))
    expect(context?.stroke).toHaveBeenCalledWith(expect.any(FakePath2D))
  })

  it('sans Path2D (jsdom), l’ampoule n’a que son rond', () => {
    const { map, raw, ask } = fakeMap()
    watchDynamicImages(map)
    ask(`${LAMP_PREFIX}#ffa85a`)
    expect(raw.addImage).toHaveBeenCalledTimes(1)
  })

  it('ignore une image déjà là, un nom inconnu, et un navigateur sans canvas', () => {
    const { map, raw, images, ask } = fakeMap()
    watchDynamicImages(map)
    images.add('temp-1°')
    ask('temp-1°')
    ask('autre-chose')
    context = null
    ask('temp-2°')
    ask('lamp-#fff')
    ask('emoji-🦊')
    expect(raw.addImage).not.toHaveBeenCalled()
  })
})

describe('addStatusDots', () => {
  it('ajoute les cinq pastilles (caméra et volet), une seule fois chacune', () => {
    const { map, raw, images } = fakeMap()
    addStatusDots(map, colors)
    expect([...images]).toEqual([CAMERA_DOT_ON_IMAGE, CAMERA_DOT_OFF_IMAGE, CAMERA_DOT_MISSING_IMAGE, SHUTTER_DOT_OPEN_IMAGE, SHUTTER_DOT_CLOSED_IMAGE])
    raw.addImage.mockClear()
    addStatusDots(map, colors)
    expect(raw.addImage).not.toHaveBeenCalled()
  })

  it('sans canvas, aucune pastille', () => {
    context = null
    const { map, raw } = fakeMap()
    addStatusDots(map, colors)
    expect(raw.addImage).not.toHaveBeenCalled()
  })
})
