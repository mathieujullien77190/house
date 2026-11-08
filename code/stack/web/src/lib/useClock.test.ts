import { act, renderHook } from '@testing-library/react'
import { formatClock, useClock } from './useClock'

describe('useClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('ne tourne pas tant qu’il est inactif', () => {
    const { result } = renderHook(() => useClock(false))
    const start = result.current
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toBe(start)
  })
  it('avance chaque seconde tant qu’il est actif', () => {
    const { result, unmount } = renderHook(() => useClock(true))
    const start = result.current
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toBe(start + 3)
    unmount()
  })
  it('formatClock écrit heures, minutes et secondes', () => {
    expect(formatClock(0)).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})
