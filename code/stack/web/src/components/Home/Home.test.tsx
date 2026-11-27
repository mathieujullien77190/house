import { fireEvent, render, screen } from '@testing-library/react'
import Home from './Home'

vi.mock('@/components/Kitchen3D', () => ({
  default: (props: { apiKey: string; onOpenCamera?: (name: string) => void }) => (
    <button data-testid="kitchen3d" onClick={() => props.onOpenCamera?.('voliere-toit')}>
      {props.apiKey}
    </button>
  ),
}))

describe('Home', () => {
  it('montre la vue 3D, chargée à part (un texte d’attente d’abord), et lui passe l’ouverture d’une caméra', async () => {
    const onOpenCamera = vi.fn()
    render(<Home apiKey="k" onOpenCamera={onOpenCamera} />)
    expect(screen.getByText('Chargement de la vue 3D…')).toBeInTheDocument()
    expect(await screen.findByTestId('kitchen3d')).toHaveTextContent('k')
    expect(screen.queryByText('Chargement de la vue 3D…')).toBeNull()
    fireEvent.click(screen.getByTestId('kitchen3d'))
    expect(onOpenCamera).toHaveBeenCalledWith('voliere-toit')
  })
})
