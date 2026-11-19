import { render, screen } from '@testing-library/react'
import MultiLineChart from './MultiLineChart'
import { barsOf, extentOf, formatTick, pathOf } from './helpers'
import type { ChartSeries } from './types'

const series: ChartSeries[] = [
  { id: 'a', label: 'Météo', tone: 'accent', points: [{ x: 0, y: 4.2 }, { x: 10, y: 9.7 }] },
  { id: 'b', label: 'Clim salon', tone: 'orange', points: [{ x: 0, y: 19 }, { x: 10, y: 20 }] },
  { id: 'c', label: 'Seul', tone: 'green', points: [{ x: 5, y: 12 }] },
]

describe('MultiLineChart', () => {
  it('trace les séries à deux points et les liste toutes dans la légende', () => {
    const { container } = render(<MultiLineChart series={series} unit="°C" label="Températures" startLabel="il y a 7 j" endLabel="maintenant" emptyText="rien" />)
    expect(container.querySelectorAll('path')).toHaveLength(2)
    expect(screen.getByRole('img', { name: 'Températures' })).toBeInTheDocument()
    expect(screen.getByText('Seul')).toBeInTheDocument()
    expect(screen.getByText('il y a 7 j')).toBeInTheDocument()
    expect(screen.getByText('4 °C')).toBeInTheDocument()
  })

  it('répartit les repères de temps et borne l’échelle au domaine', () => {
    const { container } = render(<MultiLineChart series={series} label="x" emptyText="rien" timeLabels={['lun', 'mar', 'mer']} domain={{ from: 0, to: 20 }} />)
    expect(screen.getByText('mar')).toBeInTheDocument()
    expect(container.querySelector('path')?.getAttribute('d')).toContain('150.0')
  })

  it('une série en bâtons trace un trait par point, même à un seul point', () => {
    const bars: ChartSeries = { id: 'v', label: 'Vent', tone: 'muted', bars: true, points: [{ x: 5, y: 12 }] }
    const { container } = render(<MultiLineChart series={[series[0], bars]} label="x" emptyText="rien" />)
    expect(container.querySelectorAll('path')).toHaveLength(2)
    expect(container.querySelectorAll('path')[1].getAttribute('d')).toContain(' V')
  })

  it('montre le texte vide sans série de deux points', () => {
    render(<MultiLineChart series={[series[2]]} label="x" emptyText="rien" />)
    expect(screen.getByText('rien')).toBeInTheDocument()
  })
})

describe('helpers', () => {
  it('extentOf : bornes arrondies, au moins un degré d’écart, null sans courbe', () => {
    expect(extentOf(series)).toEqual({ minX: 0, maxX: 10, minY: 4, maxY: 20 })
    expect(extentOf([{ id: 'p', label: 'p', tone: 'muted', points: [{ x: 0, y: 5 }, { x: 1, y: 5 }] }])).toEqual({ minX: 0, maxX: 1, minY: 5, maxY: 6 })
    expect(extentOf([series[2]])).toBeNull()
    expect(extentOf(series, { from: -5, to: 50 })).toEqual({ minX: -5, maxX: 50, minY: 4, maxY: 20 })
  })
  it('pathOf : vide sous deux points, une abscisse unique ne divise pas par zéro', () => {
    expect(pathOf(series[2], { minX: 0, maxX: 1, minY: 0, maxY: 1 })).toBe('')
    expect(pathOf({ id: 'p', label: 'p', tone: 'muted', points: [{ x: 3, y: 0 }, { x: 3, y: 1 }] }, { minX: 3, maxX: 3, minY: 0, maxY: 1 })).toBe('M0.0,120.0 L0.0,0.0')
  })
  it('barsOf : un bâton par point dans le cadre, les autres sont ignorés, une abscisse unique ne divise pas par zéro', () => {
    const extent = { minX: 0, maxX: 10, minY: 0, maxY: 10 }
    const bars: ChartSeries = { id: 'v', label: 'v', tone: 'muted', bars: true, points: [{ x: -1, y: 5 }, { x: 0, y: 10 }, { x: 10, y: 0 }, { x: 11, y: 5 }] }
    expect(barsOf(bars, extent)).toBe('M0.0,120 V0.0 M300.0,120 V120.0')
    expect(barsOf({ ...bars, points: [{ x: 3, y: 1 }] }, { minX: 3, maxX: 3, minY: 0, maxY: 1 })).toBe('M0.0,120 V0.0')
  })
  it('formatTick', () => {
    expect(formatTick(12.4, '°C')).toBe('12 °C')
    expect(formatTick(12.4, '')).toBe('12')
  })
})
