import { render, screen } from '@testing-library/react'
import type { BoxHook } from '@/lib/useBox'
import type { BoxState } from '@/types'
import BoxPreview from './BoxPreview'
import { LOADING_TEXT, NOT_CONFIGURED_TEXT, UNAVAILABLE_TEXT } from './constants'

vi.mock('@/lib/useBox', () => ({ useBox: vi.fn() }))
const { useBox } = await import('@/lib/useBox')

const state = (over: Partial<BoxState> = {}): BoxState => ({
  configured: true,
  reachable: true,
  model: 'Freebox',
  firmware: '4.8',
  uptime: null,
  connection: null,
  wifi: { enabled: true },
  devices: [],
  ...over,
})
const hook = (over: Partial<BoxHook> = {}): BoxHook => ({ box: state(), problem: null, busy: false, failed: false, setWifi: vi.fn(), ...over })

describe('BoxPreview', () => {
  it('le bloc compact de la box configurée (sans firmware)', () => {
    vi.mocked(useBox).mockReturnValue(hook())
    render(<BoxPreview apiKey="k" />)
    expect(screen.getByText('État de la box · Freebox')).toBeTruthy()
    expect(screen.queryByText('Firmware')).toBeNull()
  })

  it('lecture en cours, API muette, box non configurée : une note', () => {
    vi.mocked(useBox).mockReturnValue(hook({ box: null, problem: 'loading' }))
    const { rerender } = render(<BoxPreview apiKey="k" />)
    expect(screen.getByText(LOADING_TEXT)).toBeTruthy()
    vi.mocked(useBox).mockReturnValue(hook({ box: null, problem: 'off' }))
    rerender(<BoxPreview apiKey="k" />)
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeTruthy()
    vi.mocked(useBox).mockReturnValue(hook({ box: state({ configured: false }) }))
    rerender(<BoxPreview apiKey="k" />)
    expect(screen.getByText(NOT_CONFIGURED_TEXT)).toBeTruthy()
  })
})
