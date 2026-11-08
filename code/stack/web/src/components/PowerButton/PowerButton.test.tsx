import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { CameraPower } from '@/types'
import PowerButton from './PowerButton'

vi.mock('@/lib/api', () => ({ setCameraPower: vi.fn() }))
const api = await import('@/lib/api')

const power = (over: Partial<CameraPower> = {}): CameraPower => ({
  camera: 'c',
  port: 1,
  on: true,
  powered: true,
  watts: 5,
  streaming: true,
  ...over,
})

describe('PowerButton', () => {
  it('rien sans état connu ni problème', () => {
    const { container } = render(<PowerButton apiKey="k" camera="c" power={null} onPower={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('switch injoignable : un bouton grisé qui dit pourquoi', () => {
    render(<PowerButton apiKey="k" camera="c" power={null} unavailable onPower={vi.fn()} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('caméra allumée et « éteindre » caché sur téléphone : rien', () => {
    const { container } = render(<PowerButton apiKey="k" camera="c" power={power()} hideOff onPower={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('hideOff n’empêche pas d’allumer une caméra éteinte', () => {
    render(<PowerButton apiKey="k" camera="c" power={power({ on: false, powered: false })} hideOff onPower={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
  it('éteint la caméra et rend le nouvel état', async () => {
    const next = power({ on: false })
    vi.mocked(api.setCameraPower).mockResolvedValue(next)
    const onPower = vi.fn()
    render(<PowerButton apiKey="k" camera="c" power={power()} onPower={onPower} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toBeDisabled()
    await act(flush)
    expect(api.setCameraPower).toHaveBeenCalledWith('k', 'c', false)
    expect(onPower).toHaveBeenCalledWith(next)
  })
  it('allume une caméra éteinte et montre son état (démarrage)', async () => {
    vi.mocked(api.setCameraPower).mockResolvedValue(power())
    render(<PowerButton apiKey="k" camera="c" power={power({ on: true, powered: false })} onPower={vi.fn()} />)
    expect(document.body.textContent).toMatch(/.{12,}/)
    render(<PowerButton apiKey="k" camera="c" power={power({ on: false, powered: false })} onPower={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button')[1])
    await act(flush)
    expect(api.setCameraPower).toHaveBeenCalledWith('k', 'c', true)
  })
  it('un échec est signalé', async () => {
    vi.mocked(api.setCameraPower).mockRejectedValue(new Error('x'))
    const onPower = vi.fn()
    render(<PowerButton apiKey="k" camera="c" power={power()} onPower={onPower} />)
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
    expect(onPower).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toBeEnabled()
    expect(document.querySelector('span')?.textContent).toMatch(/.+/)
  })
})
