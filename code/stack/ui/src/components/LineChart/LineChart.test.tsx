import { render, screen } from '@testing-library/react'
import LineChart from './LineChart'
import { buildPaths, formatTick } from './helpers'
import type { LineChartProps } from './types'
import { HEIGHT, WIDTH } from './constants'

describe('formatTick', () => {
  it('arrondit et ajoute l unité', () => {
    expect(formatTick(49.6, '%')).toBe('50 %')
  })

  it('sans unité, le nombre seul', () => {
    expect(formatTick(12, '')).toBe('12')
  })
})

describe('buildPaths', () => {
  it('rien à tracer avec moins de deux mesures, une capacité trop petite ou un maximum nul', () => {
    expect(buildPaths([1], 10, 100)).toBeNull()
    expect(buildPaths([1, 2], 1, 100)).toBeNull()
    expect(buildPaths([1, 2], 10, 0)).toBeNull()
    expect(buildPaths([1, 2], 10, -5)).toBeNull()
  })

  it('une courbe pleine va d un bord à l autre ; 0 est en bas, le maximum en haut', () => {
    const paths = buildPaths([0, 100], 2, 100)
    expect(paths?.line).toBe(`M0.0,${HEIGHT.toFixed(1)} L${WIDTH.toFixed(1)},0.0`)
    expect(paths?.area).toBe(`${paths?.line} L${WIDTH},${HEIGHT} L0.0,${HEIGHT} Z`)
  })

  it('les mesures s alignent sur la droite quand la courbe n est pas pleine', () => {
    const paths = buildPaths([50, 50], 3, 100)
    expect(paths?.line.startsWith(`M${(WIDTH / 2).toFixed(1)},`)).toBe(true)
    expect(paths?.area).toContain(`L${(WIDTH / 2).toFixed(1)},${HEIGHT} Z`)
  })

  it('borne les valeurs entre 0 et le maximum', () => {
    const paths = buildPaths([-20, 500], 2, 100)
    expect(paths?.line).toBe(`M0.0,${HEIGHT.toFixed(1)} L${WIDTH.toFixed(1)},0.0`)
  })
})

describe('LineChart', () => {
  const props: LineChartProps = {
    values: [10, 20, 30],
    capacity: 5,
    max: 100,
    tone: 'green',
    title: 'Processeur',
    valueText: '30 %',
    label: 'Charge du processeur',
  }

  it('montre titre, valeur actuelle, graphique nommé et courbe', () => {
    const { container } = render(<LineChart {...props} />)
    expect(screen.getByText('Processeur')).toBeInTheDocument()
    expect(screen.getByText('30 %')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Charge du processeur' })).toBeInTheDocument()
    expect(container.querySelectorAll('svg path')).toHaveLength(2)
    expect(container.querySelectorAll('svg line')).toHaveLength(3)
  })

  it('l échelle montre 0, la moitié et le maximum, avec l unité', () => {
    render(<LineChart {...props} unit="%" />)
    expect(screen.getByText('0 %')).toBeInTheDocument()
    expect(screen.getByText('50 %')).toBeInTheDocument()
    expect(screen.getByText('100 %')).toBeInTheDocument()
  })

  it('l échelle sans unité ne montre que des nombres', () => {
    render(<LineChart {...props} max={8} />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('pas assez de mesures : la grille seule', () => {
    const { container } = render(<LineChart {...props} values={[10]} />)
    expect(container.querySelectorAll('svg path')).toHaveLength(0)
    expect(container.querySelectorAll('svg line')).toHaveLength(3)
  })

  it('les repères de temps ne sont montrés que s il y en a au moins un', () => {
    const { rerender } = render(<LineChart {...props} />)
    expect(screen.queryByText('maintenant')).toBeNull()
    rerender(<LineChart {...props} startLabel="−2 min" />)
    expect(screen.getByText('−2 min')).toBeInTheDocument()
    rerender(<LineChart {...props} endLabel="maintenant" />)
    expect(screen.getByText('maintenant')).toBeInTheDocument()
    rerender(<LineChart {...props} startLabel="−2 min" endLabel="maintenant" />)
    expect(screen.getByText('−2 min')).toBeInTheDocument()
    expect(screen.getByText('maintenant')).toBeInTheDocument()
  })
})
