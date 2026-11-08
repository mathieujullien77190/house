import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { HeatingLogEntry, HeatingStatus } from '@/types'
import HeatingSection from './HeatingSection'
import { INVALID_TEXT, SAVE_ERROR_TEXT, UNKNOWN_HOURS_NOTE } from './constants'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchHeating: vi.fn(),
  fetchHeatingLog: vi.fn(),
  saveHeating: vi.fn(),
}))
const api = await import('@/lib/api')

const status = (over: Partial<HeatingStatus> = {}): HeatingStatus => ({
  enabled: true,
  thresholdC: 3,
  minutes: 5,
  cooldownMinutes: 20,
  priceKwh: 0.1589,
  peakPriceKwh: 0.2142,
  offPeakStart: '23:10',
  offPeakEnd: '07:10',
  heaterWatts: 2000,
  lastActivationAt: null,
  nextAllowedAt: null,
  temperature: 1,
  night: true,
  cold: true,
  ...over,
})
const entries: HeatingLogEntry[] = [
  { at: 1_800_000_100, origin: 'auto', minutes: 5, temperature: 2, note: null, cost: 0.0265 },
  { at: 1_800_000_000, origin: 'manuel', minutes: 5, temperature: null, note: null, cost: 0.0265 },
]

const settle = async () => {
  await act(async () => {
    await flush()
  })
}

beforeEach(() => {
  vi.mocked(api.fetchHeating).mockResolvedValue(status())
  vi.mocked(api.fetchHeatingLog).mockResolvedValue(entries)
})

describe('HeatingSection', () => {
  it('ne montre rien tant que rien n’est lu, ni sans réglages (503)', async () => {
    vi.mocked(api.fetchHeating).mockRejectedValue(new api.ApiError(503, 'x'))
    const { container } = render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    expect(container).toBeEmptyDOMElement()
  })

  it('montre les réglages, la phrase d’état, le journal et son total', async () => {
    render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    expect(api.fetchHeatingLog).toHaveBeenCalledWith('k', 50)
    expect(screen.getByRole('checkbox', { name: 'Activer la règle' })).toBeChecked()
    expect(screen.getByLabelText('Température (°C)')).toHaveValue('3')
    expect(screen.getByLabelText('Durée (min)')).toHaveValue(5)
    expect(screen.getByLabelText(/Délai avant réactivation/)).toHaveValue(20)
    expect(screen.getByLabelText('Prix du kWh heures creuses (€ TTC)')).toHaveValue('0,1589')
    expect(screen.getByLabelText('Prix du kWh heures pleines (€ TTC)')).toHaveValue('0,2142')
    expect(screen.getByLabelText('Début des heures creuses')).toHaveValue('23:10')
    expect(screen.getByLabelText('Fin des heures creuses')).toHaveValue('07:10')
    expect(screen.getByLabelText(/Puissance du chauffage/)).toHaveValue(2000)
    expect(screen.getByText('pour chiffrer le coût')).toBeInTheDocument()
    expect(screen.getByText('Froid et nuit : la règle chauffera')).toBeInTheDocument()
    expect(screen.queryByText(UNKNOWN_HOURS_NOTE)).toBeNull()
    expect(screen.getByText('Automatique')).toBeInTheDocument()
    expect(screen.getByText('Manuel')).toBeInTheDocument()
    expect(screen.getAllByText('0,0265 €')).toHaveLength(2)
    expect(screen.getByText('Total des activations affichées : 0,053 €')).toBeInTheDocument()
  })

  it('plages inconnues : la phrase discrète ; journal vide : pas de total', async () => {
    vi.mocked(api.fetchHeating).mockResolvedValue(status({ offPeakEnd: null }))
    vi.mocked(api.fetchHeatingLog).mockResolvedValue([])
    render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    expect(screen.getByText(UNKNOWN_HOURS_NOTE)).toBeInTheDocument()
    expect(screen.getByText('Aucune activation pour l’instant.')).toBeInTheDocument()
    expect(screen.queryByText(/Total/)).toBeNull()
  })

  it('relit le journal quand la version change, sans défaire ce qui est tapé', async () => {
    const { rerender } = render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    fireEvent.change(screen.getByLabelText('Durée (min)'), { target: { value: '9' } })
    vi.mocked(api.fetchHeatingLog).mockResolvedValue([entries[0]])
    rerender(<HeatingSection apiKey="k" version={1} />)
    await settle()
    expect(api.fetchHeating).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText('Durée (min)')).toHaveValue(9)
    expect(screen.queryByText('Manuel')).toBeNull()
  })

  it('ignore une lecture arrivée après le démontage', async () => {
    let done: (value: HeatingStatus) => void = () => undefined
    vi.mocked(api.fetchHeating).mockReturnValue(new Promise((resolve) => (done = resolve)))
    const { unmount } = render(<HeatingSection apiKey="k" version={0} />)
    unmount()
    await act(async () => {
      done(status())
      await flush()
    })
  })

  it('« Enregistrer » envoie les champs et remet ce que l’API a gardé', async () => {
    vi.mocked(api.saveHeating).mockResolvedValue(status({ thresholdC: 2.5, enabled: false, heaterWatts: null }))
    render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Température (°C)'), { target: { value: '2,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await settle()
    expect(api.saveHeating).toHaveBeenCalledWith('k', {
      enabled: false,
      thresholdC: 2.5,
      minutes: 5,
      cooldownMinutes: 20,
      priceKwh: 0.1589,
      peakPriceKwh: 0.2142,
      offPeakStart: '23:10',
      offPeakEnd: '07:10',
      heaterWatts: 2000,
    })
    expect(screen.getByLabelText('Température (°C)')).toHaveValue('2,5')
    expect(screen.getByLabelText(/Puissance du chauffage/)).toHaveValue(null)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('un champ illisible n’envoie rien', async () => {
    render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    fireEvent.change(screen.getByLabelText('Durée (min)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await settle()
    expect(api.saveHeating).not.toHaveBeenCalled()
    expect(screen.getByText(INVALID_TEXT)).toBeInTheDocument()
  })

  it('un refus de l’API montre son texte, une autre panne un message par défaut', async () => {
    vi.mocked(api.saveHeating).mockRejectedValueOnce(new api.ApiError(400, 'minutes must be an integer from 1 to 120'))
    render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await settle()
    expect(screen.getByText('minutes must be an integer from 1 to 120')).toBeInTheDocument()
    vi.mocked(api.saveHeating).mockRejectedValueOnce(new Error('réseau'))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await settle()
    expect(screen.getByText(SAVE_ERROR_TEXT)).toBeInTheDocument()
  })
})
