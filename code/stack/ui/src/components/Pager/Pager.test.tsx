import { fireEvent, render, screen } from '@testing-library/react'
import Pager from './Pager'
import { pageCount, pageText } from './helpers'
import { EMPTY_TEXT, NEXT_ARIA, PREVIOUS_ARIA } from './constants'

describe('pageCount', () => {
  it('arrondit au-dessus', () => {
    expect(pageCount(143, 20)).toBe(8)
    expect(pageCount(40, 20)).toBe(2)
  })

  it('compte au moins une page, même vide', () => {
    expect(pageCount(0, 20)).toBe(1)
  })
})

describe('pageText', () => {
  it('donne la tranche affichée', () => {
    expect(pageText(0, 20, 143)).toBe('1 à 20 sur 143')
    expect(pageText(1, 20, 143)).toBe('21 à 40 sur 143')
  })

  it('borne la dernière page au total', () => {
    expect(pageText(7, 20, 143)).toBe('141 à 143 sur 143')
  })

  it('dit « vide » sans ligne', () => {
    expect(pageText(0, 20, 0)).toBe(EMPTY_TEXT)
  })
})

describe('Pager', () => {
  it('au début, le bouton précédent est désactivé', () => {
    const onPage = vi.fn()
    render(<Pager page={0} size={20} total={50} onPage={onPage} />)
    expect(screen.getByText('1 à 20 sur 50')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: PREVIOUS_ARIA })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: NEXT_ARIA }))
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it('à la fin, le bouton suivant est désactivé', () => {
    const onPage = vi.fn()
    render(<Pager page={2} size={20} total={50} onPage={onPage} />)
    expect(screen.getByRole('button', { name: NEXT_ARIA })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: PREVIOUS_ARIA }))
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it('vide : les deux boutons sont désactivés', () => {
    render(<Pager page={0} size={20} total={0} onPage={() => undefined} />)
    expect(screen.getByRole('button', { name: PREVIOUS_ARIA })).toBeDisabled()
    expect(screen.getByRole('button', { name: NEXT_ARIA })).toBeDisabled()
  })
})
