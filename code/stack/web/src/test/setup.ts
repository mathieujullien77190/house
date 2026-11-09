// Initialisation commune des tests : jsdom n'a ni lecteur média, ni matchMedia, ni ResizeObserver.
import '@testing-library/jest-dom/vitest'
import { queryClient } from '@/lib/queryClient'
import { isDesktop, setDesktop } from './viewport'

beforeEach(() => {
  queryClient.clear()
  setDesktop(false)
  localStorage.clear()
  sessionStorage.clear()
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width') ? isDesktop() : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = () => undefined
      unobserve = () => undefined
      disconnect = () => undefined
    },
  )
  // jsdom ne lit rien : play() et load() ne sont pas implémentés.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})
