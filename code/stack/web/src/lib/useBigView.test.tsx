import { act, render, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { useBigView } from './useBigView'

let fullscreen: Element | null = null
const lock = vi.fn()
const unlock = vi.fn()
const exit = vi.fn()

beforeEach(() => {
  fullscreen = null
  lock.mockReset().mockResolvedValue(undefined)
  unlock.mockReset()
  exit.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(document, 'fullscreenElement', { get: () => fullscreen, configurable: true })
  document.exitFullscreen = exit
  Object.defineProperty(screen, 'orientation', { value: { lock, unlock }, configurable: true })
})

// Un hôte pour que `ref` soit posé.
const host = (portrait = false) => {
  const hook = renderHook(() => useBigView(portrait))
  const element = document.createElement('div')
  element.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  hook.result.current.ref.current = element
  return { ...hook, element }
}

describe('useBigView', () => {
  it('ouvre en grand, demande le plein écran et verrouille le paysage', async () => {
    const { result, element } = host()
    await act(async () => {
      result.current.open()
      await flush()
    })
    expect(result.current.big).toBe(true)
    expect(element.requestFullscreen).toHaveBeenCalled()
    expect(lock).toHaveBeenCalledWith('landscape')
  })

  it('verrouille le portrait pour un média portrait', async () => {
    const { result } = host(true)
    await act(async () => {
      result.current.open()
      await flush()
    })
    expect(lock).toHaveBeenCalledWith('portrait')
  })

  it('un plein écran ou un verrou refusés ne gênent pas', async () => {
    const { result, element } = host()
    element.requestFullscreen = vi.fn().mockRejectedValue(new Error('non'))
    lock.mockRejectedValue(new Error('non'))
    await act(async () => {
      result.current.open()
      await flush()
    })
    expect(result.current.big).toBe(true)
  })

  it('sans élément posé, ouvre quand même', async () => {
    const { result } = renderHook(() => useBigView())
    await act(async () => {
      result.current.open()
      await flush()
    })
    expect(result.current.big).toBe(true)
  })

  it('fermer libère le verrou et quitte le plein écran réel', () => {
    const { result } = host()
    fullscreen = document.body
    act(() => result.current.close())
    expect(result.current.big).toBe(false)
    expect(unlock).toHaveBeenCalled()
    expect(exit).toHaveBeenCalled()
  })

  it('fermer hors plein écran n’appelle pas exitFullscreen ; un exit refusé est ignoré', async () => {
    const { result } = host()
    act(() => result.current.close())
    expect(exit).not.toHaveBeenCalled()
    exit.mockRejectedValue(new Error('x'))
    fullscreen = document.body
    await act(async () => {
      result.current.close()
      await flush()
    })
  })

  it('un unlock qui lève est ignoré', () => {
    unlock.mockImplementation(() => {
      throw new Error('pas d’API')
    })
    const { result } = host()
    expect(() => act(() => result.current.close())).not.toThrow()
  })

  it('fermé pendant la négociation du plein écran : défait ce qui vient de s’ouvrir', async () => {
    const { result, element } = host()
    let enter: () => void = () => undefined
    element.requestFullscreen = vi.fn(() => new Promise<void>((resolve) => (enter = resolve)))
    act(() => result.current.open())
    act(() => result.current.close())
    fullscreen = document.body
    await act(async () => {
      enter()
      await flush()
    })
    expect(exit).toHaveBeenCalled()
    expect(lock).not.toHaveBeenCalled()
  })

  it('fermé pendant la négociation, sans plein écran obtenu : rien à défaire', async () => {
    const { result, element } = host()
    let enter: () => void = () => undefined
    element.requestFullscreen = vi.fn(() => new Promise<void>((resolve) => (enter = resolve)))
    act(() => result.current.open())
    act(() => result.current.close())
    await act(async () => {
      enter()
      await flush()
    })
    expect(exit).not.toHaveBeenCalled()
  })

  it('un exit refusé pendant la négociation est ignoré', async () => {
    const { result, element } = host()
    let enter: () => void = () => undefined
    element.requestFullscreen = vi.fn(() => new Promise<void>((resolve) => (enter = resolve)))
    exit.mockRejectedValue(new Error('x'))
    act(() => result.current.open())
    act(() => result.current.close())
    fullscreen = document.body
    await act(async () => {
      enter()
      await flush()
    })
  })

  it('la sortie du plein écran réel ferme la vue en grand', async () => {
    const { result } = host()
    await act(async () => {
      result.current.open()
      await flush()
    })
    fullscreen = document.body
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.big).toBe(true)
    fullscreen = null
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.big).toBe(false)
    expect(unlock).toHaveBeenCalled()
  })

  it('rend un composant', () => {
    const View = () => <p>{String(useBigView().big)}</p>
    expect(render(<View />).container.textContent).toBe('false')
  })
})

describe('useBigView, verrou refusé écran droit', () => {
  const portraitScreen = (matches: boolean) => {
    window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia
  }

  it('quitte le plein écran réel (il ne peut pas se tourner) et garde la vue en grand ouverte', async () => {
    portraitScreen(true)
    const { result, element } = host()
    lock.mockRejectedValue(new Error('non'))
    element.requestFullscreen = vi.fn(async () => {
      fullscreen = document.body
    })
    await act(async () => {
      result.current.open()
      await flush()
    })
    expect(exit).toHaveBeenCalled()
    fullscreen = null
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.big).toBe(true)
    // la sortie suivante, venant de l'utilisateur, ferme la vue
    fullscreen = document.body
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    fullscreen = null
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.big).toBe(false)
  })

  it('une sortie refusée ne laisse pas le drapeau levé', async () => {
    portraitScreen(true)
    const { result, element } = host()
    lock.mockRejectedValue(new Error('non'))
    exit.mockRejectedValue(new Error('non'))
    element.requestFullscreen = vi.fn(async () => {
      fullscreen = document.body
    })
    await act(async () => {
      result.current.open()
      await flush()
    })
    fullscreen = null
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.big).toBe(false)
  })

  it('écran en paysage ou média portrait : le plein écran reste', async () => {
    portraitScreen(false)
    const { result, element } = host()
    lock.mockRejectedValue(new Error('non'))
    element.requestFullscreen = vi.fn(async () => {
      fullscreen = document.body
    })
    await act(async () => {
      result.current.open()
      await flush()
    })
    expect(exit).not.toHaveBeenCalled()
  })
})
