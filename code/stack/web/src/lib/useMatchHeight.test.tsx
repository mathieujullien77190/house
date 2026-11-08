import { render } from '@testing-library/react'
import { useRef } from 'react'
import { useMatchHeight } from './useMatchHeight'

let observers: { cb: () => void; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = []
beforeEach(() => {
  observers = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
      constructor(cb: () => void) {
        observers.push({ cb, observe: this.observe, disconnect: this.disconnect })
      }
    },
  )
})

const rect = (height: number) => ({ height }) as DOMRect

const Harness = ({
  withTarget = true,
  withColumn = true,
  withFrame = true,
}: {
  withTarget?: boolean
  withColumn?: boolean
  withFrame?: boolean
}) => {
  const target = useRef<HTMLDivElement>(null)
  const column = useRef<HTMLDivElement>(null)
  useMatchHeight(target, column)
  return (
    <>
      {withTarget ? <div ref={target} data-testid="goal" /> : null}
      {withColumn ? (
        <div ref={column} data-testid="side">
          <div data-testid="tile">{withFrame ? <div data-rotated-frame data-testid="frame" /> : null}</div>
        </div>
      ) : null}
    </>
  )
}

describe('useMatchHeight', () => {
  it('ne fait rien sans cible ou sans colonne', () => {
    render(<Harness withTarget={false} />)
    render(<Harness withColumn={false} />)
    expect(observers).toHaveLength(0)
  })

  it('règle --big-h d’après la hauteur de la cible moins ce qui entoure la vidéo', () => {
    const { getByTestId, unmount } = render(<Harness />)
    const goal = getByTestId('goal')
    const tile = getByTestId('tile')
    const frame = getByTestId('frame')
    const side = getByTestId('side')
    vi.spyOn(goal, 'getBoundingClientRect').mockReturnValue(rect(530))
    vi.spyOn(tile, 'getBoundingClientRect').mockReturnValue(rect(600))
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(rect(500))
    observers[0].cb()
    expect(side.style.getPropertyValue('--big-h')).toBe('430px')
    // plancher
    vi.spyOn(goal, 'getBoundingClientRect').mockReturnValue(rect(50))
    observers[0].cb()
    expect(side.style.getPropertyValue('--big-h')).toBe('120px')
    unmount()
    expect(observers[0].disconnect).toHaveBeenCalled()
  })

  it('cible cachée ou sans vignette tournée : retire la variable', () => {
    const { getByTestId } = render(<Harness />)
    const side = getByTestId('side')
    side.style.setProperty('--big-h', '1px')
    observers[0].cb() // hauteur 0 dans jsdom
    expect(side.style.getPropertyValue('--big-h')).toBe('')
    render(<Harness withFrame={false} />)
  })
})
