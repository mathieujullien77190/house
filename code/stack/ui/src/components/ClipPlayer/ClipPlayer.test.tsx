import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ClipPlayer from './ClipPlayer'
import { formatClock } from './helpers'
import type { ClipPlayerProps } from './types'
import { CLOSE_LABEL, LOADING_TEXT, PAUSE_LABEL, PLAY_LABEL, SEEK_LABEL, SOUND_LABEL } from './constants'
import { defaults, installMedia, stateOf } from '../../test/media'

let media: ReturnType<typeof installMedia>
beforeEach(() => {
  media = installMedia()
})

const makeProps = (extra: Partial<ClipPlayerProps> = {}): ClipPlayerProps => ({
  src: '/clip.mp4',
  error: '',
  startAt: 0,
  onClose: vi.fn(),
  onTime: vi.fn(),
  onDuration: vi.fn(),
  ...extra,
})

const setup = (extra: Partial<ClipPlayerProps> = {}) => {
  const props = makeProps(extra)
  const view = render(<ClipPlayer {...props} />)
  const rerender = (next: Partial<ClipPlayerProps>) => view.rerender(<ClipPlayer {...props} {...next} />)
  const video = () => view.container.querySelector('video') as HTMLVideoElement
  const audio = () => view.container.querySelector('audio') as HTMLAudioElement
  return { ...view, props, rerender, video, audio }
}
const fire = (element: Element, type: string) => fireEvent(element, new Event(type))
const audioPlays = () => media.play.mock.contexts.filter((context) => context instanceof HTMLAudioElement).length
const audioPauses = () => media.pause.mock.contexts.filter((context) => context instanceof HTMLAudioElement).length

describe('formatClock', () => {
  it('écrit minutes et secondes sur deux chiffres', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65.9)).toBe('1:05')
    expect(formatClock(600)).toBe('10:00')
  })

  it('une durée inconnue, infinie ou négative vaut zéro', () => {
    expect(formatClock(NaN)).toBe('0:00')
    expect(formatClock(Infinity)).toBe('0:00')
    expect(formatClock(-3)).toBe('0:00')
  })
})

describe('ClipPlayer états', () => {
  it('sans adresse : message de téléchargement, ni vidéo ni commandes', () => {
    const { container } = setup({ src: '' })
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
    expect(container.querySelector('video')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('en erreur : le message et Fermer, ni vidéo ni commandes ni son', () => {
    const { container, props } = setup({ error: 'Clip introuvable', audioSrc: '/c.m4a' })
    expect(screen.getByText('Clip introuvable')).toBeInTheDocument()
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('audio')).toBeNull()
    expect(screen.queryByLabelText(SEEK_LABEL)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: CLOSE_LABEL }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('la vidéo démarre en sourdine, sans commandes natives, et le bouton Fermer est absent', () => {
    const { video } = setup()
    expect(video()).toHaveAttribute('src', '/clip.mp4')
    expect(video().muted).toBe(true)
    expect(video().controls).toBe(false)
    expect(video()).toHaveAttribute('playsinline')
    expect(screen.queryByRole('button', { name: CLOSE_LABEL })).toBeNull()
  })
})

describe('ClipPlayer position de départ', () => {
  it('vidéo prête : saute à startAt et lance la lecture', () => {
    defaults.readyState = 1
    const { video } = setup({ startAt: 12 })
    expect(stateOf(video()).currentTime).toBe(12)
    expect(media.play).toHaveBeenCalled()
  })

  it('vidéo pas prête : attend ses métadonnées, une seule fois', () => {
    const { video } = setup({ startAt: 12 })
    expect(stateOf(video()).currentTime).toBe(0)
    expect(media.play).not.toHaveBeenCalled()
    fire(video(), 'loadedmetadata')
    expect(stateOf(video()).currentTime).toBe(12)
    expect(media.play).toHaveBeenCalledTimes(1)
    stateOf(video()).currentTime = 40
    fire(video(), 'loadedmetadata')
    expect(stateOf(video()).currentTime).toBe(40)
  })

  it('une nouvelle position ou un nouveau clic (restart) relance la lecture', () => {
    defaults.readyState = 1
    const { video, rerender } = setup({ startAt: 5 })
    rerender({ startAt: 30 })
    expect(stateOf(video()).currentTime).toBe(30)
    stateOf(video()).currentTime = 99
    rerender({ startAt: 30, restart: 1 })
    expect(stateOf(video()).currentTime).toBe(30)
  })

  it('une lecture refusée par le navigateur ne casse rien', async () => {
    defaults.readyState = 1
    media.play.mockRejectedValue(new Error('refusé'))
    const { video } = setup({ startAt: 3 })
    await act(async () => {})
    expect(stateOf(video()).currentTime).toBe(3)
  })

  it('démonté avant les métadonnées, ne saute plus', () => {
    const { video, unmount } = setup({ startAt: 12 })
    const element = video()
    unmount()
    fire(element, 'loadedmetadata')
    expect(stateOf(element).currentTime).toBe(0)
  })
})

describe('ClipPlayer durée et position', () => {
  it('annonce la durée tout de suite si la vidéo est prête', () => {
    defaults.readyState = 1
    defaults.duration = 90
    const { props } = setup()
    expect(props.onDuration).toHaveBeenCalledWith(90)
    expect(screen.getByText('0:00 / 1:30')).toBeInTheDocument()
  })

  it('sinon à l arrivée des métadonnées', () => {
    const { props, video } = setup()
    expect(props.onDuration).not.toHaveBeenCalled()
    stateOf(video()).duration = 45
    fire(video(), 'loadedmetadata')
    expect(props.onDuration).toHaveBeenCalledWith(45)
  })

  it('démonté avant les métadonnées, n annonce rien', () => {
    const { props, video, unmount } = setup()
    const element = video()
    unmount()
    stateOf(element).duration = 45
    fire(element, 'loadedmetadata')
    expect(props.onDuration).not.toHaveBeenCalled()
  })

  it('la durée qui change met à jour l affichage', () => {
    const { video } = setup()
    stateOf(video()).duration = 125
    fire(video(), 'durationchange')
    expect(screen.getByText('0:00 / 2:05')).toBeInTheDocument()
  })

  it('l avancée de la vidéo remonte la position et met à jour l affichage', () => {
    const { video, props } = setup()
    stateOf(video()).currentTime = 7
    fire(video(), 'timeupdate')
    expect(props.onTime).toHaveBeenCalledWith(7)
    expect(screen.getByText('0:07 / 0:00')).toBeInTheDocument()
  })

  it('la vidéo prête remonte onReady, une erreur remonte son code (0 sans code)', () => {
    const onReady = vi.fn()
    const onFailure = vi.fn()
    const { video } = setup({ onReady, onFailure })
    fire(video(), 'loadeddata')
    expect(onReady).toHaveBeenCalledTimes(1)
    fire(video(), 'error')
    expect(onFailure).toHaveBeenLastCalledWith(0)
    Object.defineProperty(video(), 'error', { configurable: true, value: { code: 4 } })
    fire(video(), 'error')
    expect(onFailure).toHaveBeenLastCalledWith(4)
  })

  it('onReady et onFailure sont facultatifs', () => {
    const { video } = setup()
    fire(video(), 'loadeddata')
    fire(video(), 'error')
    expect(video()).toBeInTheDocument()
  })
})

describe('ClipPlayer commandes', () => {
  it('Lecture lance la vidéo, le bouton devient Pause, qui l arrête', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: PLAY_LABEL }))
    expect(media.play).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: PAUSE_LABEL }))
    expect(media.pause).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: PLAY_LABEL })).toBeInTheDocument()
  })

  it('un clic sur la vidéo la lance ou l arrête', () => {
    const { video } = setup()
    fireEvent.click(video())
    expect(screen.getByRole('button', { name: PAUSE_LABEL })).toBeInTheDocument()
    fireEvent.click(video())
    expect(screen.getByRole('button', { name: PLAY_LABEL })).toBeInTheDocument()
  })

  it('une lecture refusée au clic ne casse rien', async () => {
    media.play.mockRejectedValue(new Error('refusé'))
    setup()
    fireEvent.click(screen.getByRole('button', { name: PLAY_LABEL }))
    await act(async () => {})
    expect(screen.getByRole('button', { name: PLAY_LABEL })).toBeInTheDocument()
  })

  it('la fin de la vidéo remet le bouton sur Lecture', () => {
    const { video } = setup()
    fireEvent.click(screen.getByRole('button', { name: PLAY_LABEL }))
    stateOf(video()).paused = true
    fire(video(), 'ended')
    expect(screen.getByRole('button', { name: PLAY_LABEL })).toBeInTheDocument()
  })

  it('démarre sur Pause si la vidéo joue déjà', () => {
    defaults.paused = false
    setup()
    expect(screen.getByRole('button', { name: PAUSE_LABEL })).toBeInTheDocument()
  })

  it('la barre de temps déplace la vidéo', () => {
    const { video } = setup()
    stateOf(video()).duration = 100
    fire(video(), 'durationchange')
    const range = screen.getByLabelText(SEEK_LABEL)
    expect(range).toHaveAttribute('max', '100')
    fireEvent.change(range, { target: { value: '42' } })
    expect(stateOf(video()).currentTime).toBe(42)
    expect(screen.getByText('0:42 / 1:40')).toBeInTheDocument()
    expect(range).toHaveValue('42')
  })

  it('durée inconnue : la barre est à zéro', () => {
    setup()
    const range = screen.getByLabelText(SEEK_LABEL)
    expect(range).toHaveAttribute('max', '0')
    expect(range).toHaveValue('0')
  })

  it('les commandes vont dans l élément du parent quand il en donne un', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const { container } = setup({ controlsHost: host })
    expect(host.querySelector('input[type="range"]')).not.toBeNull()
    expect(container.querySelector('input[type="range"]')).toBeNull()
    host.remove()
  })

  it('sans élément (null), elles sont posées dans l image', () => {
    const { container } = setup({ controlsHost: null })
    expect(container.querySelector('input[type="range"]')).not.toBeNull()
  })
})

describe('ClipPlayer son à part', () => {
  const withAudio = (extra: Partial<ClipPlayerProps> = {}) => setup({ audioSrc: '/clip.m4a', ...extra })

  it('un <audio> caché accompagne la vidéo, seulement avec une adresse de son', () => {
    const { audio, unmount } = withAudio()
    expect(audio()).toHaveAttribute('src', '/clip.m4a')
    unmount()
    expect(setup().audio()).toBeNull()
  })

  it('sans vidéo prête, pas de son', () => {
    expect(withAudio({ src: '' }).audio()).toBeNull()
  })

  it('quand la vidéo joue, le son joue à la même vitesse et se cale si l écart dépasse 0,4 s', () => {
    const { video, audio } = withAudio()
    stateOf(video()).currentTime = 10
    stateOf(video()).playbackRate = 1.5
    fire(video(), 'playing')
    expect(audioPlays()).toBe(1)
    expect(stateOf(audio()).currentTime).toBe(10)
    expect(stateOf(audio()).playbackRate).toBe(1.5)
  })

  it('un petit écart (moins de 0,4 s) n est pas corrigé', () => {
    const { video, audio } = withAudio()
    stateOf(video()).currentTime = 10
    stateOf(audio()).currentTime = 10.2
    fire(video(), 'playing')
    expect(stateOf(audio()).currentTime).toBe(10.2)
    stateOf(video()).currentTime = 11
    fire(video(), 'timeupdate')
    expect(stateOf(audio()).currentTime).toBe(11)
  })

  it('pause, attente et fin de la vidéo arrêtent le son', () => {
    const { video } = withAudio()
    const before = audioPauses()
    fire(video(), 'pause')
    fire(video(), 'waiting')
    fire(video(), 'ended')
    expect(audioPauses() - before).toBe(3)
  })

  it('un saut de la vidéo déplace le son, un changement de vitesse aussi', () => {
    const { video, audio } = withAudio()
    stateOf(video()).currentTime = 33
    fire(video(), 'seeked')
    expect(stateOf(audio()).currentTime).toBe(33)
    stateOf(video()).playbackRate = 2
    fire(video(), 'ratechange')
    expect(stateOf(audio()).playbackRate).toBe(2)
  })

  it('la vidéo qui joue déjà (assez de données) lance le son dès le montage', () => {
    defaults.paused = false
    defaults.readyState = 4
    withAudio()
    expect(audioPlays()).toBe(1)
  })

  it('vidéo en pause ou pas assez chargée : le son ne démarre pas tout seul', () => {
    defaults.paused = false
    defaults.readyState = 2
    const { unmount } = withAudio()
    expect(audioPlays()).toBe(0)
    unmount()
    media.play.mockClear()
    // La lecture demandée par le saut de départ ne doit pas démarrer la vidéo ici.
    media.play.mockImplementation(() => Promise.resolve())
    defaults.paused = true
    defaults.readyState = 4
    withAudio()
    expect(audioPlays()).toBe(0)
  })

  it('le son refusé par le navigateur propose « Activer le son » ; un toucher le lance', async () => {
    const { video, audio } = withAudio()
    media.play.mockImplementation(function (this: HTMLMediaElement) {
      return this instanceof HTMLAudioElement ? Promise.reject(new Error('refusé')) : Promise.resolve()
    })
    fire(video(), 'playing')
    const button = await screen.findByRole('button', { name: SOUND_LABEL })
    // Le toucher réussit cette fois.
    media.play.mockImplementation(() => Promise.resolve())
    stateOf(video()).currentTime = 21
    fireEvent.click(button)
    await waitFor(() => expect(screen.queryByRole('button', { name: SOUND_LABEL })).toBeNull())
    expect(stateOf(audio()).currentTime).toBe(21)
  })

  it('si le toucher est encore refusé, le bouton reste', async () => {
    const { video } = withAudio()
    media.play.mockImplementation(function (this: HTMLMediaElement) {
      return this instanceof HTMLAudioElement ? Promise.reject(new Error('refusé')) : Promise.resolve()
    })
    fire(video(), 'playing')
    fireEvent.click(await screen.findByRole('button', { name: SOUND_LABEL }))
    await act(async () => {})
    expect(screen.getByRole('button', { name: SOUND_LABEL })).toBeInTheDocument()
  })

  it('un son qui finit par jouer retire le bouton', async () => {
    const { video } = withAudio()
    media.play.mockImplementation(function (this: HTMLMediaElement) {
      return this instanceof HTMLAudioElement ? Promise.reject(new Error('refusé')) : Promise.resolve()
    })
    fire(video(), 'playing')
    await screen.findByRole('button', { name: SOUND_LABEL })
    media.play.mockImplementation(() => Promise.resolve())
    fire(video(), 'playing')
    await waitFor(() => expect(screen.queryByRole('button', { name: SOUND_LABEL })).toBeNull())
  })

  it('le bouton reste affiché mais inactif si le clip passe en erreur (plus d audio)', async () => {
    const { video, rerender } = withAudio()
    media.play.mockImplementation(function (this: HTMLMediaElement) {
      return this instanceof HTMLAudioElement ? Promise.reject(new Error('refusé')) : Promise.resolve()
    })
    fire(video(), 'playing')
    const button = await screen.findByRole('button', { name: SOUND_LABEL })
    rerender({ error: 'Clip perdu' })
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: SOUND_LABEL })).toBeInTheDocument()
  })

  it('démonté, le son est arrêté et les écouteurs retirés', () => {
    const { video, unmount } = withAudio()
    const element = video()
    const before = audioPauses()
    unmount()
    expect(audioPauses()).toBeGreaterThan(before)
    const plays = audioPlays()
    fire(element, 'playing')
    expect(audioPlays()).toBe(plays)
  })
})
