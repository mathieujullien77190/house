import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NO_FILTER } from './filter'
import { useFilter } from './useFilter'

describe('useFilter', () => {
  it('commence sans filtre', () => {
    const { result } = renderHook(() => useFilter(() => undefined))
    expect(result.current.filter).toEqual(NO_FILTER)
  })

  it('chaque changement fusionne le filtre et prévient (retour à la première page)', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFilter(onChange))
    act(() => result.current.change({ match: 'cam' }))
    act(() => result.current.change({ day: '2026-11-07' }))
    expect(result.current.filter).toEqual({ match: 'cam', day: '2026-11-07' })
    expect(onChange).toHaveBeenCalledTimes(2)
    act(() => result.current.change(NO_FILTER))
    expect(result.current.filter).toEqual(NO_FILTER)
  })
})
