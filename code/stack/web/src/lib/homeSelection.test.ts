import { act, renderHook } from '@testing-library/react'
import { chooseOnHome, resetHomeSelection, useHomeSelection } from './homeSelection'

beforeEach(() => resetHomeSelection())

describe('homeSelection', () => {
  it('rien n’est choisi au départ ; choisir un objet lâche les autres', () => {
    const { result } = renderHook(() => useHomeSelection())
    expect(result.current).toEqual({ camera: '', plug: false, ac: '', shutter: '', emoji: '', box: false })
    act(() => chooseOnHome({ camera: 'cam' }))
    expect(result.current.camera).toBe('cam')
    act(() => chooseOnHome({ emoji: 'clip-1' }))
    expect(result.current).toEqual({ camera: '', plug: false, ac: '', shutter: '', emoji: 'clip-1', box: false })
    act(() => chooseOnHome({ box: true }))
    expect(result.current.box).toBe(true)
    act(() => chooseOnHome({ emoji: 'clip-1' }))
    act(() => chooseOnHome())
    expect(result.current.emoji).toBe('')
  })

  it('la sélection survit au démontage du composant (changement d’onglet) et se retrouve au retour', () => {
    const first = renderHook(() => useHomeSelection())
    act(() => chooseOnHome({ ac: 'salon' }))
    first.unmount()
    const second = renderHook(() => useHomeSelection())
    expect(second.result.current.ac).toBe('salon')
  })

  it('deux écouteurs voient le même changement, un écouteur retiré ne reçoit plus rien', () => {
    const a = renderHook(() => useHomeSelection())
    const b = renderHook(() => useHomeSelection())
    act(() => chooseOnHome({ plug: true }))
    expect(a.result.current.plug).toBe(true)
    expect(b.result.current.plug).toBe(true)
    a.unmount()
    act(() => chooseOnHome({ shutter: '1' }))
    expect(b.result.current.shutter).toBe('1')
  })
})
