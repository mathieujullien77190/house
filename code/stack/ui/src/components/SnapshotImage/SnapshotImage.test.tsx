import { fireEvent, render, screen } from '@testing-library/react'
import SnapshotImage from './SnapshotImage'
import { ALT, EMPTY_IMAGE, LOADING_TEXT } from './constants'

describe('SnapshotImage sans adresse', () => {
  it('montre le message à la place de l image', () => {
    render(<SnapshotImage src="" message="Caméra éteinte" />)
    expect(screen.getByText('Caméra éteinte')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('droit : le message est dans un bloc à part (remis droit dans un cadre tourné)', () => {
    const { container, rerender } = render(<SnapshotImage src="" message="Éteinte" />)
    const plain = container.firstElementChild?.className
    expect(container.querySelector('div > span')).toBeNull()
    rerender(<SnapshotImage src="" message="Éteinte" upright />)
    expect(container.querySelector('div > span')).toHaveTextContent('Éteinte')
    expect(container.firstElementChild?.className).not.toBe(plain)
  })
})

describe('SnapshotImage avec adresse', () => {
  it('montre l image et un chargement jusqu à son arrivée', () => {
    render(<SnapshotImage src="/frame.jpg" message="x" />)
    const image = screen.getByRole('img', { name: ALT })
    expect(image).toHaveAttribute('src', '/frame.jpg')
    expect(screen.getByRole('status')).toHaveTextContent(LOADING_TEXT)
    fireEvent.load(image)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('l arrivée de l image donne sa taille réelle au parent', () => {
    const onSize = vi.fn()
    render(<SnapshotImage src="/frame.jpg" message="x" onSize={onSize} />)
    const image = screen.getByRole('img')
    Object.defineProperty(image, 'naturalWidth', { value: 3840 })
    Object.defineProperty(image, 'naturalHeight', { value: 2160 })
    fireEvent.load(image)
    expect(onSize).toHaveBeenCalledWith(3840, 2160)
  })

  it('l arrivée marche sans onSize', () => {
    render(<SnapshotImage src="/frame.jpg" message="x" />)
    fireEvent.load(screen.getByRole('img'))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('une image en échec arrête aussi le chargement', () => {
    render(<SnapshotImage src="/frame.jpg" message="x" />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('une nouvelle adresse remet le chargement', () => {
    const { rerender } = render(<SnapshotImage src="/a.jpg" message="x" />)
    fireEvent.load(screen.getByRole('img'))
    expect(screen.queryByRole('status')).toBeNull()
    rerender(<SnapshotImage src="/b.jpg" message="x" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('montre l étiquette seulement si elle existe', () => {
    const { rerender } = render(<SnapshotImage src="/a.jpg" message="x" />)
    expect(screen.queryByText('img-42')).toBeNull()
    rerender(<SnapshotImage src="/a.jpg" message="x" label="img-42" />)
    expect(screen.getByText('img-42')).toBeInTheDocument()
  })

  it('droit : chargement et étiquette prennent leurs classes remises droites', () => {
    const { rerender } = render(<SnapshotImage src="/a.jpg" message="x" label="L" />)
    const normal = [screen.getByRole('status').firstElementChild?.className, screen.getByText('L').className]
    rerender(<SnapshotImage src="/a.jpg" message="x" label="L" upright />)
    const upright = [screen.getByRole('status').firstElementChild?.className, screen.getByText('L').className]
    expect(upright[0]).not.toBe(normal[0])
    expect(upright[1]).not.toBe(normal[1])
  })
})

describe('SnapshotImage quiet', () => {
  it('quiet : pas de voile « Chargement… » pendant que l’image arrive', () => {
    render(<SnapshotImage src="/frame.jpg" message="x" quiet />)
    expect(screen.getByRole('img', { name: ALT })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('un nouvel affichage de l image ne coupe pas son flux : seul son retrait le coupe', () => {
    const { rerender } = render(<SnapshotImage src="/stream?camera=a" message="x" />)
    const image = screen.getByRole('img', { name: ALT }) as HTMLImageElement
    fireEvent.load(image)
    rerender(<SnapshotImage src="/stream?camera=a" message="y" label="Direct" />)
    expect(image.getAttribute('src')).toBe('/stream?camera=a')
  })

  it('retirer l image coupe sa requête (un flux du direct ne se termine jamais tout seul)', () => {
    const { unmount } = render(<SnapshotImage src="/stream?camera=a" message="x" />)
    const image = screen.getByRole('img', { name: ALT }) as HTMLImageElement
    unmount()
    expect(image.getAttribute('src')).toBe(EMPTY_IMAGE)
  })
})

