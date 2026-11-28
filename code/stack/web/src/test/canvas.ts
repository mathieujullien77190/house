// Doubles du canevas pour les tests : jsdom ne sait ni donner un contexte 2D, ni rendre une image.

/** Un faux contexte 2D : il retient les appels de dessin. */
export const fakeContext2d = () => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  ellipse: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  drawImage: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  font: '',
  textAlign: '',
  textBaseline: '',
  globalAlpha: 1,
  lineWidth: 1,
})

export type FakeContext2d = ReturnType<typeof fakeContext2d>

/** Tout canevas rend ce contexte (ou `null` : le navigateur ne sait pas dessiner). */
export const stubCanvasContext = (context: FakeContext2d | null) => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context as never)

/** Tout canevas rend cette image quand on lui demande son contenu. */
export const stubCanvasImage = (image: string) => vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => image)

/** Retient les vidéos créées hors de la page (`document.createElement('video')`). */
export const collectVideos = (): HTMLVideoElement[] => {
  const videos: HTMLVideoElement[] = []
  const create = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
    const element = create(tag, options)
    if (tag === 'video') videos.push(element as HTMLVideoElement)
    return element
  })
  return videos
}
