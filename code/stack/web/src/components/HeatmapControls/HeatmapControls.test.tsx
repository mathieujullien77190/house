import { fireEvent, render, screen } from '@testing-library/react'
import type { HeatmapStatus } from '@/types'
import HeatmapControls from './HeatmapControls'
import { levelOf, statusText } from './helpers'

const status = (over: Partial<HeatmapStatus> = {}): HeatmapStatus => ({
  cols: 2,
  rows: 1,
  thresholds: [1, 2, 3, 4, 5, 6, 7, 8],
  pairs: 5,
  computing: false,
  done: 0,
  total: 0,
  levels: [],
  ...over,
})

describe('statusText', () => {
  it('échec, attente, avancement, carte vide, carte prête', () => {
    expect(statusText(null, true)).toBe('Carte indisponible')
    expect(statusText(null, false)).toBe('Calcul…')
    expect(statusText(status({ computing: true, done: 1, total: 4 }), false)).toBe('Calcul 25 %')
    expect(statusText(status({ computing: true }), false)).toBe('Calcul…')
    expect(statusText(status({ pairs: 0 }), false)).toBe('Pas assez d’images')
    expect(statusText(status(), false)).toBe('')
  })
})

describe('levelOf', () => {
  it('plus la sensibilité est grande, plus le seuil est fin, dans les bornes', () => {
    expect(levelOf(8, 8)).toBe(0)
    expect(levelOf(4, 8)).toBe(4)
    expect(levelOf(1, 8)).toBe(7)
    expect(levelOf(1, 3)).toBe(2)
    expect(levelOf(20, 8)).toBe(0)
  })
})

describe('HeatmapControls', () => {
  it('éteinte : seulement le bouton, qui bascule', () => {
    const onToggle = vi.fn()
    render(<HeatmapControls on={false} onToggle={onToggle} sensitivity={4} onSensitivity={vi.fn()} data={null} failed={false} />)
    const button = screen.getByRole('button', { name: 'Carte de chaleur' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('slider')).toBeNull()
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalled()
  })

  it('allumée : le curseur de sensibilité et l’état', () => {
    const onSensitivity = vi.fn()
    render(<HeatmapControls on onToggle={vi.fn()} sensitivity={4} onSensitivity={onSensitivity} data={status({ computing: true, done: 1, total: 2 })} failed={false} />)
    expect(screen.getByRole('button', { name: 'Carte de chaleur' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Calcul 50 %')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider', { name: 'Sensibilité' }), { target: { value: '6' } })
    expect(onSensitivity).toHaveBeenCalledWith(6)
  })
})
