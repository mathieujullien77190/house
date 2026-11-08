import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { EventRow } from '@/types'
import { useMotionNotifications } from './useMotionNotifications'

const NOW = 1_800_000_000
const event = (id: string, age = 10): EventRow => ({ id, camera: 'cam', started_at: NOW - age }) as EventRow

class FakeNotification {
  static permission: NotificationPermission = 'granted'
  static requestPermission = vi.fn()
  static created: FakeNotification[] = []
  onclick: (() => void) | null = null
  close = vi.fn()
  constructor(
    public title: string,
    public options: unknown,
  ) {
    FakeNotification.created.push(this)
  }
}

const setSW = (value: unknown) => {
  if (value === undefined) Reflect.deleteProperty(navigator, 'serviceWorker')
  else Object.defineProperty(navigator, 'serviceWorker', { value, configurable: true })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW * 1000)
  localStorage.clear()
  FakeNotification.permission = 'granted'
  FakeNotification.created = []
  FakeNotification.requestPermission.mockReset()
  vi.stubGlobal('Notification', FakeNotification)
  setSW(undefined)
})
afterEach(() => {
  vi.useRealTimers()
  setSW(undefined)
})

const enabled = () => localStorage.setItem('house-notify', '1')

describe('useMotionNotifications', () => {
  it('non supporté', () => {
    vi.stubGlobal('Notification', undefined)
    const { result } = renderHook(() => useMotionNotifications([], true))
    expect(result.current.state).toBe('unsupported')
    act(() => result.current.toggle())
    expect(result.current.state).toBe('unsupported')
  })

  it('refusé, éteint, allumé', () => {
    FakeNotification.permission = 'denied'
    expect(renderHook(() => useMotionNotifications([], true)).result.current.state).toBe('denied')
    FakeNotification.permission = 'granted'
    expect(renderHook(() => useMotionNotifications([], true)).result.current.state).toBe('off')
    enabled()
    expect(renderHook(() => useMotionNotifications([], true)).result.current.state).toBe('on')
  })

  it('le stockage indisponible compte comme éteint', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('x')
    })
    expect(renderHook(() => useMotionNotifications([], true)).result.current.state).toBe('off')
  })

  it('notifie les nouveaux événements récents, pas ceux d’avant ni les vieux', async () => {
    enabled()
    const { rerender } = renderHook(({ events }) => useMotionNotifications(events, true), { initialProps: { events: [event('a')] } })
    rerender({ events: [event('a'), event('b'), event('vieux', 1000)] })
    rerender({ events: [event('a'), event('b'), event('vieux', 1000)] })
    await act(flush)
    expect(FakeNotification.created.map((n) => n.title)).toEqual(['Mouvement · cam'])
    expect(FakeNotification.created).toHaveLength(1)
  })

  it('se remet à zéro quand la page n’est plus prête', () => {
    enabled()
    const { rerender } = renderHook(({ ready }) => useMotionNotifications([event('a')], ready), { initialProps: { ready: true } })
    rerender({ ready: false })
    rerender({ ready: true })
    expect(FakeNotification.created).toHaveLength(0)
  })

  it('passe par le service worker quand il est là', async () => {
    enabled()
    const showNotification = vi.fn().mockResolvedValue(undefined)
    setSW({ getRegistration: vi.fn().mockResolvedValue({ showNotification }) })
    const { rerender } = renderHook(({ events }) => useMotionNotifications(events, true), { initialProps: { events: [] as EventRow[] } })
    rerender({ events: [event('n')] })
    await act(flush)
    expect(showNotification).toHaveBeenCalledWith('Mouvement · cam', expect.objectContaining({ tag: 'n' }))
    expect(FakeNotification.created).toHaveLength(0)
  })

  it('sans enregistrement ou si le service worker refuse : notification directe, le clic ramène sur la page', async () => {
    enabled()
    setSW({ getRegistration: vi.fn().mockResolvedValue(undefined) })
    const { rerender } = renderHook(({ events }) => useMotionNotifications(events, true), { initialProps: { events: [] as EventRow[] } })
    rerender({ events: [event('n')] })
    await act(flush)
    expect(FakeNotification.created).toHaveLength(1)
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => undefined)
    FakeNotification.created[0].onclick?.()
    expect(focus).toHaveBeenCalled()
    expect(FakeNotification.created[0].close).toHaveBeenCalled()

    setSW({ getRegistration: vi.fn().mockRejectedValue(new Error('x')) })
    rerender({ events: [event('n'), event('m')] })
    await act(flush)
    expect(FakeNotification.created).toHaveLength(2)
  })

  it('aucune notification possible : ignoré', async () => {
    enabled()
    vi.stubGlobal(
      'Notification',
      Object.assign(
        function () {
          throw new Error('non')
        },
        { permission: 'granted' },
      ),
    )
    const { rerender } = renderHook(({ events }) => useMotionNotifications(events, true), { initialProps: { events: [] as EventRow[] } })
    rerender({ events: [event('n')] })
    await act(flush)
  })

  it('toggle : désactive quand actif', () => {
    enabled()
    const { result } = renderHook(() => useMotionNotifications([], true))
    act(() => result.current.toggle())
    expect(result.current.state).toBe('off')
    expect(localStorage.getItem('house-notify')).toBeNull()
  })

  it('toggle : demande l’accord, enregistre le service worker et mémorise', async () => {
    const register = vi.fn().mockResolvedValue(undefined)
    setSW({ register })
    FakeNotification.requestPermission.mockResolvedValue('granted')
    const { result } = renderHook(() => useMotionNotifications([], true))
    act(() => result.current.toggle())
    await act(flush)
    expect(register).toHaveBeenCalledWith('/sw.js')
    expect(result.current.state).toBe('on')
    expect(localStorage.getItem('house-notify')).toBe('1')
  })

  it('toggle : l’enregistrement du service worker qui échoue est ignoré', async () => {
    setSW({ register: vi.fn().mockRejectedValue(new Error('x')) })
    FakeNotification.requestPermission.mockResolvedValue('granted')
    const { result } = renderHook(() => useMotionNotifications([], true))
    act(() => result.current.toggle())
    await act(flush)
    expect(result.current.state).toBe('on')
  })

  it('toggle : accord refusé', async () => {
    FakeNotification.requestPermission.mockResolvedValue('denied')
    const { result } = renderHook(() => useMotionNotifications([], true))
    act(() => result.current.toggle())
    await act(flush)
    expect(result.current.state).toBe('denied')
    expect(localStorage.getItem('house-notify')).toBeNull()
  })

  it('toggle sans service worker disponible : pas d’enregistrement', async () => {
    FakeNotification.requestPermission.mockResolvedValue('granted')
    const { result } = renderHook(() => useMotionNotifications([], true))
    act(() => result.current.toggle())
    await act(flush)
    expect(result.current.state).toBe('on')
  })

  it('le stockage qui refuse l’écriture est ignoré', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('x')
    })
    FakeNotification.requestPermission.mockResolvedValue('granted')
    const { result } = renderHook(() => useMotionNotifications([], true))
    act(() => result.current.toggle())
    await act(flush)
    expect(result.current.state).toBe('on')
  })
})
