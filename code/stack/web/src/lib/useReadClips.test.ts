import { act, renderHook } from '@testing-library/react'
import { useReadClips } from './useReadClips'

const KEY = 'house-read-clips'
beforeEach(() => localStorage.clear())

describe('useReadClips', () => {
  it('marque lu, sans doublon, et garde dans le navigateur', () => {
    const { result } = renderHook(() => useReadClips())
    expect(result.current.isRead('a')).toBe(false)
    act(() => result.current.markRead('a'))
    act(() => result.current.markRead('a'))
    expect(result.current.isRead('a')).toBe(true)
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toEqual(['a'])
  })
  it('relit les identifiants gardés et filtre ce qui n’est pas du texte', () => {
    localStorage.setItem(KEY, JSON.stringify(['x', 3, null]))
    const { result } = renderHook(() => useReadClips())
    expect(result.current.isRead('x')).toBe(true)
  })
  it('un contenu qui n’est pas une liste, ou illisible, donne une liste vide', () => {
    localStorage.setItem(KEY, '{"a":1}')
    expect(renderHook(() => useReadClips()).result.current.isRead('a')).toBe(false)
    localStorage.setItem(KEY, 'pas du json')
    expect(renderHook(() => useReadClips()).result.current.isRead('a')).toBe(false)
  })
  it('n’en garde que 500', () => {
    localStorage.setItem(KEY, JSON.stringify(Array.from({ length: 500 }, (_, i) => `id${i}`)))
    const { result } = renderHook(() => useReadClips())
    act(() => result.current.markRead('nouveau'))
    expect(result.current.isRead('id0')).toBe(false)
    expect(result.current.isRead('nouveau')).toBe(true)
  })
  it('survit à un stockage indisponible', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('plein')
    })
    const { result } = renderHook(() => useReadClips())
    act(() => result.current.markRead('a'))
    expect(result.current.isRead('a')).toBe(true)
  })
})
