import { render, screen } from '@testing-library/react'
import type { BoxHook } from '@/lib/useBox'
import type { BoxGuestsHook } from '@/lib/useBoxGuests'
import type { BoxState } from '@/types'
import BoxPanel from './BoxPanel'
import { LOADING_TEXT, NOT_CONFIGURED_TEXT, UNAVAILABLE_TEXT } from './constants'

vi.mock('@/lib/useBox', () => ({ useBox: vi.fn() }))
vi.mock('@/lib/useBoxGuests', () => ({ useBoxGuests: vi.fn() }))
vi.mock('@/components/GuestWifi', () => ({ default: () => <span>guest-wifi</span> }))
const { useBox } = await import('@/lib/useBox')
const { useBoxGuests } = await import('@/lib/useBoxGuests')

const state = (over: Partial<BoxState> = {}): BoxState => ({
  configured: true,
  reachable: true,
  model: 'Freebox',
  firmware: null,
  uptime: null,
  connection: null,
  wifi: { enabled: true },
  devices: [],
  ...over,
})
const hook = (over: Partial<BoxHook> = {}): BoxHook => ({ box: state(), problem: null, busy: false, failed: false, setWifi: vi.fn(), ...over })
const guestsHook = (over: Partial<BoxGuestsHook> = {}): BoxGuestsHook => ({ guests: null, busy: null, error: null, setExcluded: vi.fn(), ...over })

describe('BoxPanel', () => {
  it('lecture en cours, API muette', () => {
    vi.mocked(useBoxGuests).mockReturnValue(guestsHook())
    vi.mocked(useBox).mockReturnValue(hook({ box: null, problem: 'loading' }))
    const { rerender } = render(<BoxPanel apiKey="k" />)
    expect(screen.getByText(LOADING_TEXT)).toBeTruthy()
    vi.mocked(useBox).mockReturnValue(hook({ box: null, problem: 'off' }))
    rerender(<BoxPanel apiKey="k" />)
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeTruthy()
    expect(useBoxGuests).toHaveBeenLastCalledWith('k', false)
  })

  it('box non configurée : la note remplace les blocs', () => {
    vi.mocked(useBoxGuests).mockReturnValue(guestsHook())
    vi.mocked(useBox).mockReturnValue(hook({ box: state({ configured: false }) }))
    render(<BoxPanel apiKey="k" />)
    expect(screen.getByText(NOT_CONFIGURED_TEXT)).toBeTruthy()
    expect(screen.queryByText('État de la box · Freebox')).toBeNull()
  })

  it('box configurée : le bloc, le WiFi invité et, une fois lus, les invités', () => {
    vi.mocked(useBoxGuests).mockReturnValue(guestsHook())
    vi.mocked(useBox).mockReturnValue(hook())
    const { rerender } = render(<BoxPanel apiKey="k" />)
    expect(screen.getByText('État de la box · Freebox')).toBeTruthy()
    expect(screen.getByText('guest-wifi')).toBeTruthy()
    expect(screen.queryByText('Appareils invités')).toBeNull()
    expect(useBoxGuests).toHaveBeenLastCalledWith('k', true)
    vi.mocked(useBoxGuests).mockReturnValue(guestsHook({ guests: { filterState: 'disabled', guests: [], events: [] } }))
    rerender(<BoxPanel apiKey="k" />)
    expect(screen.getByText('Appareils invités')).toBeTruthy()
  })
})
