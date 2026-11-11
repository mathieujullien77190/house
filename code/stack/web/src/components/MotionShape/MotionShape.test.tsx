import { render } from '@testing-library/react'
import MotionShape, { shapesAt } from '.'
import { SHAPE_HOLD_SECONDS, svgPoints } from './helpers'

const TRIANGLE: [number, number][] = [[0.1, 0.2], [0.5, 0.2], [0.3, 0.6]]

describe('MotionShape', () => {
  it('dessine un polygone par contour, en pourcentages', () => {
    const { container } = render(<MotionShape shapes={[TRIANGLE, TRIANGLE]} />)
    const polygons = container.querySelectorAll('polygon')
    expect(polygons).toHaveLength(2)
    expect(polygons[0]).toHaveAttribute('points', '10,20 50,20 30,60')
  })

  it('sans contour, rien', () => {
    const { container } = render(<MotionShape shapes={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})

describe('shapesAt', () => {
  const clip = { frames: [[1, [TRIANGLE]], [2, []], [4, [TRIANGLE]]] as [number, [number, number][][]][] }

  it('le dernier relevé à cet instant, s’il est assez récent', () => {
    expect(shapesAt(clip, 1)).toEqual([TRIANGLE])
    expect(shapesAt(clip, 1 + SHAPE_HOLD_SECONDS)).toEqual([TRIANGLE])
    expect(shapesAt(clip, 4.2)).toEqual([TRIANGLE])
  })

  it('rien avant le premier relevé, trop longtemps après, ou sans contours', () => {
    expect(shapesAt(clip, 0.5)).toEqual([])
    expect(shapesAt(clip, 1.6)).toEqual([])
    expect(shapesAt(clip, 2.1)).toEqual([])
    expect(shapesAt(null, 1)).toEqual([])
  })

  it('svgPoints écrit les sommets', () => {
    expect(svgPoints(TRIANGLE)).toBe('10,20 50,20 30,60')
  })
})
