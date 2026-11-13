import { fireEvent, render, screen } from '@testing-library/react'
import type { BoxGuest, BoxGuests } from '@/types'
import GuestsBlock from './GuestsBlock'
import { guestCells } from './helpers'

const guest = (patch: Partial<BoxGuest> = {}): BoxGuest => ({
  mac: 'AA:BB:CC:DD:EE:01',
  name: 'Tel de Paul',
  ip: '192.168.1.9',
  type: 'smartphone',
  vendor: null,
  firstSeen: 1_800_000_000,
  lastSeen: 1_800_000_100,
  active: true,
  excluded: false,
  ...patch,
})
const guests = (patch: Partial<BoxGuests> = {}): BoxGuests => ({
  filterState: 'disabled',
  guests: [guest(), guest({ mac: 'AA:BB:CC:DD:EE:02', name: 'Montre', ip: null, active: false, excluded: true })],
  events: [{ at: 1_800_000_000, event: 'connect', mac: 'AA:BB:CC:DD:EE:01', name: '', ip: null, type: null, vendor: null }],
  ...patch,
})

describe('helpers', () => {
  it('guestCells', () => {
    const [first, second] = guests().guests
    expect(guestCells(first).slice(0, 2)).toEqual(['Tel de Paul', '192.168.1.9'])
    expect(guestCells(first).slice(4)).toEqual(['Connecté', '–'])
    expect(guestCells(second)[1]).toBe('–')
    expect(guestCells(second).slice(4)).toEqual(['Hors ligne', 'Exclu'])
  })
})

describe('GuestsBlock', () => {
  it('titre et tableau, sans bouton « Ajouter à la maison »', () => {
    render(<GuestsBlock guests={guests()} busy={null} error={null} onExclude={vi.fn()} />)
    expect(screen.getByText('Appareils invités')).toBeTruthy()
    expect(screen.getByText('Tel de Paul')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ajouter à la maison' })).toBeNull()
  })

  it('Exclure et Réadmettre sont directs (sans confirmation)', () => {
    const onExclude = vi.fn()
    render(<GuestsBlock guests={guests()} busy={null} error={null} onExclude={onExclude} />)
    fireEvent.click(screen.getByRole('button', { name: 'Exclure' }))
    expect(onExclude).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01', true)
    fireEvent.click(screen.getByRole('button', { name: 'Réadmettre' }))
    expect(onExclude).toHaveBeenCalledWith('AA:BB:CC:DD:EE:02', false)
  })

  it('grise les boutons de la ligne en cours et montre l’erreur', () => {
    render(<GuestsBlock guests={guests()} busy="AA:BB:CC:DD:EE:01" error="Oups" onExclude={vi.fn()} />)
    expect((screen.getByRole('button', { name: 'Exclure' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Réadmettre' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByText('Oups')).toBeTruthy()
  })

  it('sans invité ni événement : le dit', () => {
    render(<GuestsBlock guests={guests({ guests: [], events: [] })} busy={null} error={null} onExclude={vi.fn()} />)
    expect(screen.getByText('Aucun invité connecté.')).toBeTruthy()
  })
})
