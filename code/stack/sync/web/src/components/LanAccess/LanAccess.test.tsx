import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import LanAccess from '@/components/LanAccess'
import type { LanAccessSettings } from '@/components/LanAccess'

vi.mock('@/lib/api', () => ({ fetchLanAccess: vi.fn(), saveLanAccess: vi.fn() }))
const m = vi.mocked(api)

const settings = (patch: Partial<LanAccessSettings> = {}): LanAccessSettings => ({
  enabled: true,
  cameras: false,
  shutters: true,
  lights: false,
  ac: false,
  address: 'https://chezmatou.local:8080/chezmatou',
  ...patch,
})
const tab = (group: string, name: string) => within(screen.getByRole('tablist', { name: group })).getByRole('tab', { name })

beforeEach(() => {
  vi.resetAllMocks()
  m.fetchLanAccess.mockResolvedValue(settings())
})

describe('chargement', () => {
  it('montre les interrupteurs et l’adresse sans la clé', async () => {
    render(<LanAccess />)
    expect(await screen.findByText('https://chezmatou.local:8080/chezmatou')).toBeTruthy()
    expect(tab('Page invité du réseau', 'Activé').getAttribute('aria-selected')).toBe('true')
    expect(tab('Voir les deux caméras des perruches', 'Coupé').getAttribute('aria-selected')).toBe('true')
    expect(tab('Ouvrir et fermer les volets', 'Activé').getAttribute('aria-selected')).toBe('true')
  })

  it('rien tant que la lecture n’est pas revenue', () => {
    m.fetchLanAccess.mockReturnValue(new Promise(() => undefined))
    const { container } = render(<LanAccess />)
    expect(container.innerHTML).toBe('')
  })

  it('lecture impossible : un message', async () => {
    m.fetchLanAccess.mockRejectedValue(new Error('non'))
    render(<LanAccess />)
    expect(await screen.findByText(/n’ont pas pu être lus/)).toBeTruthy()
  })

  it('démonté avant la réponse : rien n’est rangé', async () => {
    let answer: (value: LanAccessSettings) => void = () => undefined
    m.fetchLanAccess.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
    const first = render(<LanAccess />)
    first.unmount()
    answer(settings())
    let fail: (reason: Error) => void = () => undefined
    m.fetchLanAccess.mockReturnValueOnce(new Promise((_resolve, reject) => (fail = reject)))
    const second = render(<LanAccess />)
    second.unmount()
    fail(new Error('non'))
    await Promise.resolve()
    expect(m.fetchLanAccess).toHaveBeenCalledTimes(2)
  })
})

describe('interrupteurs', () => {
  it('un interrupteur s’enregistre tout de suite', async () => {
    m.saveLanAccess.mockResolvedValue(settings({ cameras: true }))
    render(<LanAccess />)
    await screen.findByText(/chezmatou\.local/)
    fireEvent.click(tab('Voir les deux caméras des perruches', 'Activé'))
    expect(m.saveLanAccess).toHaveBeenCalledWith({ cameras: true })
    await waitFor(() => expect(tab('Voir les deux caméras des perruches', 'Activé').getAttribute('aria-selected')).toBe('true'))
  })

  it('couper envoie false', async () => {
    m.saveLanAccess.mockResolvedValue(settings({ shutters: false }))
    render(<LanAccess />)
    await screen.findByText(/chezmatou\.local/)
    fireEvent.click(tab('Ouvrir et fermer les volets', 'Coupé'))
    expect(m.saveLanAccess).toHaveBeenCalledWith({ shutters: false })
  })

  it('un échec montre un message, un succès l’efface', async () => {
    m.saveLanAccess.mockRejectedValueOnce(new Error('non')).mockResolvedValueOnce(settings({ ac: true }))
    render(<LanAccess />)
    await screen.findByText(/chezmatou\.local/)
    fireEvent.click(tab('Gérer les climatisations', 'Activé'))
    expect(await screen.findByText(/n’a pas pu être enregistré/)).toBeTruthy()
    fireEvent.click(tab('Gérer les climatisations', 'Activé'))
    await waitFor(() => expect(screen.queryByText(/n’a pas pu être enregistré/)).toBeNull())
  })
})
