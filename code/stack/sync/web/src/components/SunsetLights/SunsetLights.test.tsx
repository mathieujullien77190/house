import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import SunsetLights from '@/components/SunsetLights'
import { nextRunText, offsetText } from './helpers'
import type { SunsetLightsSettings } from './types'

vi.mock('@/lib/api', () => ({
  fetchSunsetLights: vi.fn(),
  saveSunsetLights: vi.fn(),
}))
const m = vi.mocked(api)

const settings = (patch: Partial<SunsetLightsSettings> = {}): SunsetLightsSettings => ({
  enabled: true,
  lights: ['3', '5'],
  offset_minutes: 0,
  next_run: '2026-11-18T16:30:00.000Z',
  catch_up_minutes: 60,
  ...patch,
})
const SWITCH = 'Allumer les lampes au coucher du soleil'
const tab = (name: string) => screen.getByRole('tab', { name })

beforeEach(() => {
  vi.resetAllMocks()
  m.fetchSunsetLights.mockResolvedValue(settings())
})

describe('SunsetLights', () => {
  it('montre l’interrupteur, la prochaine heure, le décalage', async () => {
    render(<SunsetLights />)
    expect(await screen.findByRole('tablist', { name: SWITCH })).toBeTruthy()
    expect(tab('Activé').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText(/mercredi 18 nov\./)).toBeTruthy()
    expect(screen.getByText('Décalage : au coucher du soleil')).toBeTruthy()
  })

  it('coupé : aucune heure prévue', async () => {
    m.fetchSunsetLights.mockResolvedValue(settings({ enabled: false, next_run: null }))
    render(<SunsetLights />)
    expect(await screen.findByText('aucun (coupé)')).toBeTruthy()
    expect(tab('Coupé').getAttribute('aria-selected')).toBe('true')
  })

  it('rien tant que la lecture n’est pas faite, un message si elle échoue', async () => {
    m.fetchSunsetLights.mockReturnValue(new Promise(() => undefined))
    const pending = render(<SunsetLights />)
    expect(pending.container.firstChild).toBeNull()
    pending.unmount()
    m.fetchSunsetLights.mockRejectedValue(new Error('x'))
    render(<SunsetLights />)
    expect(await screen.findByText('Le réglage de l’allumage au coucher du soleil n’a pas pu être lu.')).toBeTruthy()
  })

  it('un clic enregistre l’interrupteur ; un échec le dit, un succès efface le message', async () => {
    m.saveSunsetLights.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(settings({ enabled: false, next_run: null }))
    render(<SunsetLights />)
    await screen.findByRole('tablist', { name: SWITCH })
    fireEvent.click(tab('Coupé'))
    expect(await screen.findByText('Ce réglage n’a pas pu être enregistré. Réessaie.')).toBeTruthy()
    fireEvent.click(tab('Coupé'))
    await waitFor(() => expect(screen.queryByText('Ce réglage n’a pas pu être enregistré. Réessaie.')).toBeNull())
    expect(m.saveSunsetLights).toHaveBeenCalledWith(false)
    expect(tab('Coupé').getAttribute('aria-selected')).toBe('true')
  })

  it('une réponse qui arrive après le démontage est ignorée', async () => {
    let resolve: (value: SunsetLightsSettings) => void = () => undefined
    let reject: (error: Error) => void = () => undefined
    m.fetchSunsetLights.mockReturnValueOnce(new Promise((done, fail) => ((resolve = done), (reject = fail))))
    render(<SunsetLights />).unmount()
    resolve(settings())
    m.fetchSunsetLights.mockReturnValueOnce(new Promise((done, fail) => ((resolve = done), (reject = fail))))
    render(<SunsetLights />).unmount()
    reject(new Error('tard'))
    await Promise.resolve()
  })
})

describe('helpers', () => {
  it('nextRunText : à l’heure de la maison, null sans heure', () => {
    expect(nextRunText(null)).toBeNull()
    expect(nextRunText('2026-11-18T16:30:00.000Z')).toBe('mercredi 18 nov. à 17:30')
  })
  it('offsetText : au coucher, après, avant', () => {
    expect(offsetText(0)).toBe('au coucher du soleil')
    expect(offsetText(10)).toBe('10 min après le coucher')
    expect(offsetText(-15)).toBe('15 min avant le coucher')
  })
})
