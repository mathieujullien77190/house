import { fireEvent, render, screen } from '@testing-library/react'
import PieChart from './PieChart'
import { arcLengths, arcPath, buildArcs } from './helpers'
import type { PieSlice } from './types'
import { ARC_ACTIVE_CLASS, MIN_LENGTH, RADIUS, ROW_ACTIVE_CLASS } from './constants'

const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const slice = (id: string, value: number, extra: Partial<PieSlice> = {}): PieSlice => ({
  id,
  label: id.toUpperCase(),
  value,
  display: `${value} Mo`,
  tone: 'accent',
  ...extra,
})

describe('arcLengths', () => {
  it('répartit le tour au prorata des valeurs', () => {
    const lengths = arcLengths([1, 3], 100)
    expect(lengths[0]).toBeCloseTo(25)
    expect(lengths[1]).toBeCloseTo(75)
  })

  it('tout à zéro : aucune part', () => {
    expect(arcLengths([0, 0], 100)).toEqual([0, 0])
    expect(arcLengths([], 100)).toEqual([])
  })

  it('une valeur négative compte pour zéro', () => {
    expect(arcLengths([-5, 10], 100)).toEqual([0, 100])
  })

  it('une petite part est portée au minimum visible, pris sur la plus grande', () => {
    const lengths = arcLengths([1, 100000], CIRCUMFERENCE)
    expect(lengths[0]).toBe(MIN_LENGTH)
    expect(lengths[0] + lengths[1]).toBeCloseTo(CIRCUMFERENCE)
  })

  it('sans petite part, rien n est retiré', () => {
    const lengths = arcLengths([1, 1], CIRCUMFERENCE)
    expect(lengths[0] + lengths[1]).toBeCloseTo(CIRCUMFERENCE)
    expect(lengths[0]).toBeCloseTo(CIRCUMFERENCE / 2)
  })
})

describe('arcPath', () => {
  it('un arc court est un petit arc', () => {
    expect(arcPath(0, CIRCUMFERENCE / 4, CIRCUMFERENCE)).toMatch(/^M[\d. ]+ A\d+ \d+ 0 0 1 /)
  })

  it('plus d un demi-tour utilise le grand arc', () => {
    expect(arcPath(0, CIRCUMFERENCE * 0.75, CIRCUMFERENCE)).toMatch(/ 0 1 1 /)
  })

  it('un tour complet est tracé en deux demi-arcs (un arc de 360° n existe pas en SVG)', () => {
    const path = arcPath(0, CIRCUMFERENCE, CIRCUMFERENCE)
    expect(path.match(/A/g)).toHaveLength(2)
  })
})

describe('buildArcs', () => {
  it('un arc par part non vide, avec une zone de survol au moins aussi large', () => {
    const arcs = buildArcs([slice('a', 10), slice('b', 0), slice('c', 5)])
    expect(arcs.map((arc) => arc.id)).toEqual(['a', 'c'])
    expect(arcs[0].slice.id).toBe('a')
  })

  it('une part très courte reçoit une zone de survol plus large que son arc', () => {
    const [tiny] = buildArcs([slice('tiny', 0.00001), slice('big', 100000)])
    expect(tiny.hitPath).not.toBe(tiny.path)
  })

  it('une part assez longue a la même zone de survol', () => {
    const [first] = buildArcs([slice('a', 1), slice('b', 1)])
    expect(first.hitPath).toBe(first.path)
  })

  it('aucune part, aucun arc', () => {
    expect(buildArcs([])).toEqual([])
  })
})

describe('PieChart', () => {
  const slices = [slice('a', 30, { display: '30 Mo', tone: 'green' }), slice('b', 0, { tone: 'danger' }), slice('c', 70, { display: '70 Mo' })]

  it('nomme le graphique, montre le centre et la légende de toutes les parts (même vides)', () => {
    render(<PieChart slices={slices} centerValue="100 Mo" centerLabel="Total" label="Répartition" />)
    expect(screen.getByRole('img', { name: 'Répartition' })).toBeInTheDocument()
    expect(screen.getByText('100 Mo')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('30 Mo')).toBeInTheDocument()
  })

  it('chaque arc a une infobulle, les parts vides n en ont pas', () => {
    const { container } = render(<PieChart slices={slices} centerValue="x" centerLabel="y" label="z" />)
    expect(Array.from(container.querySelectorAll('title')).map((title) => title.textContent)).toEqual(['A : 30 Mo', 'C : 70 Mo'])
  })

  it('survoler une part éclaircit son arc et surligne sa ligne, la quitter remet tout', () => {
    const { container } = render(<PieChart slices={slices} centerValue="x" centerLabel="y" label="z" />)
    const paths = Array.from(container.querySelectorAll('svg path'))
    // Les arcs visibles d abord, puis les zones de survol.
    expect(paths).toHaveLength(4)
    const row = screen.getByText('A').closest('li') as HTMLElement
    fireEvent.mouseEnter(paths[2])
    expect(paths[0].getAttribute('class')).toContain(ARC_ACTIVE_CLASS)
    expect(paths[1].getAttribute('class')).not.toContain(ARC_ACTIVE_CLASS)
    expect(row.className).toContain(ROW_ACTIVE_CLASS)
    fireEvent.mouseLeave(paths[2])
    expect(paths[0].getAttribute('class')).not.toContain(ARC_ACTIVE_CLASS)
    expect(row.className).not.toContain(ROW_ACTIVE_CLASS)
  })

  it('survoler une ligne de la légende éclaircit l arc de la part', () => {
    const { container } = render(<PieChart slices={slices} centerValue="x" centerLabel="y" label="z" />)
    const arc = container.querySelector('svg path')
    const row = screen.getByText('A').closest('li') as HTMLElement
    fireEvent.mouseEnter(row)
    expect(arc?.getAttribute('class')).toContain(ARC_ACTIVE_CLASS)
    fireEvent.mouseLeave(row)
    expect(arc?.getAttribute('class')).not.toContain(ARC_ACTIVE_CLASS)
  })
})
