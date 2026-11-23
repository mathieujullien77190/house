import { readTvMode } from './tvMode'

const at = (search: string) => window.history.replaceState(null, '', '/' + search)

describe('readTvMode', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
    at('')
  })

  it('sans ?tv=1 : faux', () => {
    expect(readTvMode()).toBe(false)
  })

  it('?tv=1 : vrai, et gardé pour l’onglet quand la query disparaît', () => {
    at('?tv=1')
    expect(readTvMode()).toBe(true)
    at('')
    expect(readTvMode()).toBe(true)
  })

  it('une autre valeur de tv : faux', () => {
    at('?tv=0')
    expect(readTvMode()).toBe(false)
  })

  it('sans stockage : la query seule décide', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    at('?tv=1')
    expect(readTvMode()).toBe(true)
    at('')
    expect(readTvMode()).toBe(false)
  })
})
