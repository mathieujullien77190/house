import { act, fireEvent, render, screen } from '@testing-library/react'
import LiveAudio from './LiveAudio'
import { FAILED_TEXT, GAIN, LABEL_OFF, LABEL_ON } from './constants'

/** Un lecteur audio simulé : jsdom n'a pas de vrai `Audio`. */
class FakeAudio {
  static all: FakeAudio[] = []
  static playResult: () => Promise<void> = () => Promise.resolve()
  src: string
  handlers: Record<string, () => void> = {}
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn()
  play = vi.fn(() => FakeAudio.playResult())
  constructor(src: string) {
    this.src = src
    FakeAudio.all.push(this)
  }
  addEventListener(name: string, handler: () => void) {
    this.handlers[name] = handler
  }
}

/** Un circuit Web Audio simulé : chaque nœud se connecte au suivant. */
class FakeContext {
  static all: FakeContext[] = []
  static broken = false
  destination = { name: 'destination' }
  gain = { value: 0 }
  resume = vi.fn(() => Promise.resolve())
  close = vi.fn(() => Promise.resolve())
  source = { connect: vi.fn((node: unknown) => node) }
  gainNode = { gain: this.gain, connect: vi.fn((node: unknown) => node) }
  limiter = { connect: vi.fn((node: unknown) => node) }
  constructor() {
    if (FakeContext.broken) throw new Error('Web Audio absent')
    FakeContext.all.push(this)
  }
  createGain() {
    return this.gainNode
  }
  createDynamicsCompressor() {
    return this.limiter
  }
  createMediaElementSource() {
    return this.source
  }
}

beforeEach(() => {
  FakeAudio.all = []
  FakeAudio.playResult = () => Promise.resolve()
  FakeContext.all = []
  FakeContext.broken = false
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('AudioContext', FakeContext)
})

const button = () => screen.getByRole('button')

describe('LiveAudio', () => {
  it('au repos : l’icône coupée, rien n’est demandé', () => {
    render(<LiveAudio camera="a b" />)
    expect(button()).toHaveAttribute('aria-label', LABEL_OFF)
    expect(button()).toHaveAttribute('aria-pressed', 'false')
    expect(FakeAudio.all).toHaveLength(0)
  })
  it('un clic démarre le son à l’adresse de la caméra, avec le gain et le limiteur', () => {
    render(<LiveAudio camera="a b" />)
    fireEvent.click(button())
    const [player] = FakeAudio.all
    const [context] = FakeContext.all
    expect(player.src).toBe('/audio?camera=a%20b')
    expect(player.play).toHaveBeenCalledTimes(1)
    expect(context.resume).toHaveBeenCalledTimes(1)
    expect(context.gain.value).toBe(GAIN)
    expect(context.source.connect).toHaveBeenCalledWith(context.gainNode)
    expect(context.gainNode.connect).toHaveBeenCalledWith(context.limiter)
    expect(context.limiter.connect).toHaveBeenCalledWith(context.destination)
    expect(button()).toHaveAttribute('aria-label', LABEL_ON)
    expect(button()).toHaveAttribute('aria-pressed', 'true')
    expect(button().className).toContain('border-accent')
    // La lecture qui démarre relance le circuit resté en pause.
    player.handlers.playing()
    expect(context.resume).toHaveBeenCalledTimes(2)
  })
  it('un second clic coupe le son et libère le flux', () => {
    render(<LiveAudio camera="a" />)
    fireEvent.click(button())
    fireEvent.click(button())
    const [player] = FakeAudio.all
    expect(player.pause).toHaveBeenCalledTimes(1)
    expect(player.removeAttribute).toHaveBeenCalledWith('src')
    expect(player.load).toHaveBeenCalledTimes(1)
    expect(FakeContext.all[0].close).toHaveBeenCalledTimes(1)
    expect(button()).toHaveAttribute('aria-pressed', 'false')
    expect(button()).toHaveAttribute('aria-label', LABEL_OFF)
  })
  it('une erreur du flux : cadre rouge et info-bulle ; un nouveau clic réessaie', () => {
    render(<LiveAudio camera="a" />)
    fireEvent.click(button())
    act(() => FakeAudio.all[0].handlers.error())
    expect(button()).toHaveAttribute('title', FAILED_TEXT)
    expect(button().className).toContain('border-danger')
    expect(button()).toHaveAttribute('aria-pressed', 'false')
    expect(FakeAudio.all[0].pause).toHaveBeenCalledTimes(1)
    fireEvent.click(button())
    expect(FakeAudio.all).toHaveLength(2)
    expect(button()).toHaveAttribute('title', LABEL_ON)
  })
  it('une lecture refusée : même résultat que l’erreur', async () => {
    FakeAudio.playResult = () => Promise.reject(new Error('refusé'))
    render(<LiveAudio camera="a" />)
    fireEvent.click(button())
    await act(async () => undefined)
    expect(button()).toHaveAttribute('title', FAILED_TEXT)
    expect(button().className).toContain('border-danger')
  })
  it('changer de caméra coupe le son', () => {
    const view = render(<LiveAudio camera="a" />)
    fireEvent.click(button())
    view.rerender(<LiveAudio camera="b" />)
    expect(FakeAudio.all[0].pause).toHaveBeenCalledTimes(1)
    expect(button()).toHaveAttribute('aria-pressed', 'false')
  })
  it('quitter la vidéo (démontage) coupe le son ; sans son ouvert, rien à couper', () => {
    const idle = render(<LiveAudio camera="a" />)
    idle.unmount()
    expect(FakeAudio.all).toHaveLength(0)
    const view = render(<LiveAudio camera="a" />)
    fireEvent.click(button())
    view.unmount()
    expect(FakeAudio.all[0].pause).toHaveBeenCalledTimes(1)
    expect(FakeContext.all[0].close).toHaveBeenCalledTimes(1)
  })
  it('sans Web Audio : le son est joué tel quel et se coupe sans circuit', () => {
    FakeContext.broken = true
    render(<LiveAudio camera="a" />)
    fireEvent.click(button())
    const [player] = FakeAudio.all
    expect(player.play).toHaveBeenCalledTimes(1)
    expect(button()).toHaveAttribute('aria-pressed', 'true')
    player.handlers.playing()
    fireEvent.click(button())
    expect(player.pause).toHaveBeenCalledTimes(1)
    expect(button()).toHaveAttribute('aria-pressed', 'false')
  })
})
