import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { HeatingStatus } from '@/types'
import HeatingSection from './HeatingSection'
import { INVALID_TEXT, SAVE_ERROR_TEXT } from './constants'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchHeating: vi.fn(),
  saveHeating: vi.fn(),
}))
const api = await import('@/lib/api')

const status = (over: Partial<HeatingStatus> = {}): HeatingStatus => ({
  enabled: true,
  thresholdC: 3,
  minutes: 5,
  cooldownMinutes: 20,
  lastActivationAt: null,
  nextAllowedAt: null,
  temperature: 1,
  night: true,
  cold: true,
  ...over,
})
const settle = async () => {
  await act(async () => {
    await flush()
  })
}

beforeEach(() => {
  vi.mocked(api.fetchHeating).mockResolvedValue(status())
})

describe('HeatingSection', () => {
  it('ne montre rien tant que rien n’est lu, ni sans réglages (503)', async () => {
    vi.mocked(api.fetchHeating).mockRejectedValue(new api.ApiError(503, 'x'))
    const { container } = render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    expect(container).toBeEmptyDOMElement()
  })

  it('montre les réglages et leurs valeurs', async () => {
    render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    expect(screen.getByRole('checkbox', { name: 'Activer la règle' })).toBeChecked()
    expect(screen.getByLabelText('Température (°C)')).toHaveValue('3')
    expect(screen.getByLabelText('Durée (min)')).toHaveValue(5)
    expect(screen.getByLabelText(/Délai avant réactivation/)).toHaveValue(20)
    expect(screen.queryByLabelText(/Prix du kWh/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/heures creuses/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Puissance/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Journal/)).toBeNull()
  })

  it('relit les réglages quand la version change, sans défaire ce qui est tapé', async () => {
    const { rerender } = render(<HeatingSection apiKey="k" version={0} />)
    await settle()
    fireEvent.change(screen.getByLabelText('Durée (min)'), { target: { value: '9' } })
    rerender(<HeatingSection apiKey="k" version={1} />)
    await settle()
    expect(api.fetchHeating).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText('Durée (min)')).toHaveValue(9)
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
    vi.mocked(api.saveHeating).mockResolvedValue(status({ thresholdC: 2.5, enabled: false }))
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
        })
    expect(screen.getByLabelText('Température (°C)')).toHaveValue('2,5')
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
