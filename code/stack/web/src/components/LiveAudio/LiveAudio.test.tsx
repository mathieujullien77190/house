import { act, fireEvent, render, screen } from '@testing-library/react'
import LiveAudio from './LiveAudio'
import { FAILED_TEXT, GAIN, LABEL_OFF, LABEL_ON } from './constants'
import { END_DELAY_MS, endLive } from './session'

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
  endLive()
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
  it('quitter la vidéo (démontage) coupe le son après un instant ; sans son ouvert, rien à couper', () => {
    vi.useFakeTimers()
    const idle = render(<LiveAudio camera="a" />)
    idle.unmount()
    vi.advanceTimersByTime(END_DELAY_MS)
    expect(FakeAudio.all).toHaveLength(0)
    const view = render(<LiveAudio camera="a" />)
    fireEvent.click(button())
    view.unmount()
    expect(FakeAudio.all[0].pause).not.toHaveBeenCalled()
    vi.advanceTimersByTime(END_DELAY_MS)
    expect(FakeAudio.all[0].pause).toHaveBeenCalledTimes(1)
    expect(FakeContext.all[0].close).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
  it('vue en grand : le bouton remonté ailleurs reprend le même son, sans coupure', () => {
    vi.useFakeTimers()
    const first = render(<LiveAudio camera="a" />)
    fireEvent.click(button())
    first.unmount()
    // Le nouveau bouton arrive tout de suite : même lecteur, rien n'est coupé, il est déjà « ouvert ».
    render(<LiveAudio camera="a" />)
    vi.advanceTimersByTime(END_DELAY_MS * 2)
    expect(FakeAudio.all).toHaveLength(1)
    expect(FakeAudio.all[0].pause).not.toHaveBeenCalled()
    expect(button()).toHaveAttribute('aria-pressed', 'true')
    vi.useRealTimers()
  })
  it('un bouton qui disparaît ne coupe pas le son démarré entre-temps par un autre bouton', () => {
    vi.useFakeTimers()
    const gone = render(<LiveAudio camera="a" />)
    render(<LiveAudio camera="b" />)
    gone.unmount()
    fireEvent.click(button())
    vi.advanceTimersByTime(END_DELAY_MS * 2)
    expect(FakeAudio.all[0].pause).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
  it('arriver sur une autre caméra coupe le son de la précédente', () => {
    const first = render(<LiveAudio camera="a" />)
    fireEvent.click(button())
    first.unmount()
    render(<LiveAudio camera="b" />)
    expect(FakeAudio.all[0].pause).toHaveBeenCalledTimes(1)
    expect(button()).toHaveAttribute('aria-pressed', 'false')
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

describe('LiveAudio : le son se garde d’une caméra à l’autre et en vue en grand', () => {
  it('ouvert dès l’arrivée quand il l’était avant, sans le signaler de nouveau', () => {
    const onChange = vi.fn()
    render(<LiveAudio camera="b" initialOn onChange={onChange} />)
    expect(FakeAudio.all).toHaveLength(1)
    expect(FakeAudio.all[0].src).toContain('camera=b')
    expect(button()).toHaveAttribute('aria-pressed', 'true')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('signale l’ouverture et la coupure faites par l’utilisateur', () => {
    const onChange = vi.fn()
    render(<LiveAudio camera="a" onChange={onChange} />)
    fireEvent.click(button())
    expect(onChange).toHaveBeenLastCalledWith(true)
    fireEvent.click(button())
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('un flux qui ne démarre pas est signalé comme coupé', async () => {
    FakeAudio.playResult = () => Promise.reject(new Error('refusé'))
    const onChange = vi.fn()
    render(<LiveAudio camera="a" onChange={onChange} />)
    await act(async () => {
      fireEvent.click(button())
    })
    expect(onChange).toHaveBeenLastCalledWith(false)
  })
})
