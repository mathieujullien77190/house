// Un faux élément média pour jsdom, qui n'implémente ni la lecture ni l'état d'un <video> / <audio>.
// Chaque élément a son état (lecture, position, durée…) ; `play` et `pause` le changent et déclenchent l'événement du navigateur.
export interface MediaState {
  readyState: number
  paused: boolean
  duration: number
  currentTime: number
  playbackRate: number
}

const initialState = (): MediaState => ({ readyState: 0, paused: true, duration: NaN, currentTime: 0, playbackRate: 1 })

const states = new WeakMap<object, MediaState>()
/** Les valeurs de départ des éléments créés ensuite. */
export const defaults: MediaState = initialState()

export const stateOf = (element: object): MediaState => {
  let state = states.get(element)
  if (!state) {
    state = { ...defaults }
    states.set(element, state)
  }
  return state
}

const KEYS: (keyof MediaState)[] = ['readyState', 'paused', 'duration', 'currentTime', 'playbackRate']

/** À appeler avant chaque test : installe l'état et remet les valeurs de départ. `play` et `pause` sont des doubles que le test peut régler. */
export const installMedia = () => {
  Object.assign(defaults, initialState())
  for (const key of KEYS) {
    Object.defineProperty(HTMLMediaElement.prototype, key, {
      configurable: true,
      get(this: HTMLMediaElement) {
        return stateOf(this)[key]
      },
      set(this: HTMLMediaElement, value: never) {
        ;(stateOf(this) as unknown as Record<string, unknown>)[key] = value
      },
    })
  }
  const play = vi.fn(function (this: HTMLMediaElement): Promise<void> {
    stateOf(this).paused = false
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  })
  const pause = vi.fn(function (this: HTMLMediaElement): void {
    stateOf(this).paused = true
    this.dispatchEvent(new Event('pause'))
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, writable: true, value: play })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, writable: true, value: pause })
  return { play, pause }
}
