import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { guestLink } from './helpers'
import GuestLink from './GuestLink'

const info = { key: 'abc', port: 8090, url: '' }
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

describe('guestLink', () => {
  it('adresse publique ou hôte de House Sync, avec la clé', () => {
    expect(guestLink({ key: 'sec ret', port: 8090, url: '' }, 'mini')).toBe('https://mini:8090/?k=sec+ret')
    expect(guestLink({ key: 'sec ret', port: 8090, url: 'https://pub.example/' }, 'mini')).toBe('https://pub.example/?k=sec+ret')
  })
})

describe('GuestLink', () => {
  it('montre le lien (nouvel onglet) et copie l’adresse', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<GuestLink info={info} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('href')).toBe(`https://${window.location.hostname}:8090/?k=abc`)
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
    expect(writeText).toHaveBeenCalledWith(link.getAttribute('href'))
    expect(screen.getByRole('button').textContent).toMatch(/copié/i)
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByRole('button').textContent).not.toMatch(/copié/i)
  })

  it('un échec de copie le dit', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('non')) }, configurable: true })
    render(<GuestLink info={info} />)
    const before = screen.getByRole('button').textContent
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
    expect(screen.getByRole('button').textContent).toBe('Copie impossible')
    expect(before).toBe('Copier le lien')
  })
})
