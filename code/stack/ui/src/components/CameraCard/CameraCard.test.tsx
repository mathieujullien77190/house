import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import CameraCard from './CameraCard'
import type { CameraCardProps } from './types'
import {
  COLLAPSE_ICON,
  COLLAPSE_LABEL,
  EXPAND_LABEL,
  LAYER_CLASS,
  SCREEN_EXPAND_ICON,
  SOUND_CLASS,
  SOUND_EXPANDED_CLASS,
  SOUND_SCREEN_CLASS,
  ZOOM_AREA_CLASS,
} from './constants'

const base: CameraCardProps = {
  name: 'Volière extérieur',
  media: <div>vidéo</div>,
  timeline: <div>frise</div>,
}
const renderCard = (extra: Partial<CameraCardProps> = {}) => render(<CameraCard {...base} {...extra} />)
const mediaArea = () => screen.getByText('vidéo').parentElement?.parentElement as HTMLElement
const gesture = () => ({ handlers: { onPointerDown: vi.fn() }, style: { transform: 'scale(2)' } })

describe('CameraCard bureau', () => {
  it('montre nom, média et frise (plus de légende)', () => {
    renderCard()
    expect(screen.getByRole('heading', { name: 'Volière extérieur' })).toBeInTheDocument()
    expect(screen.queryByRole('figure')?.querySelector('figcaption')).toBeNull()
    expect(screen.getByText('vidéo')).toBeInTheDocument()
    expect(screen.getByText('frise')).toBeInTheDocument()
  })

  it('actions à côté du nom, détails sous le média, avertissement, superposition : seulement s ils existent', () => {
    const { rerender } = renderCard()
    expect(screen.queryByText('actions')).toBeNull()
    rerender(
      <CameraCard {...base} actions={<button>actions</button>} details={<p>détails</p>} warning="En cours" overlay={<span>9 °C</span>} />,
    )
    expect(screen.getByText('actions')).toBeInTheDocument()
    expect(screen.getByText('détails')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText('9 °C')).toBeInTheDocument()
  })

  it('le bouton « en grand » n existe que si le parent sait l ouvrir', () => {
    const onExpand = vi.fn()
    const { rerender } = renderCard()
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<CameraCard {...base} onExpand={onExpand} />)
    fireEvent.click(screen.getByRole('button', { name: EXPAND_LABEL }))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('un média en portrait change son bloc', () => {
    const { container, rerender } = renderCard()
    const normal = mediaArea().parentElement?.className
    rerender(<CameraCard {...base} portraitMedia />)
    expect(mediaArea().parentElement?.className).not.toBe(normal)
    expect(container).toBeTruthy()
  })

  it('donne la figure au parent par figureRef', () => {
    const figureRef = createRef<HTMLElement>()
    renderCard({ figureRef })
    expect(figureRef.current?.tagName).toBe('FIGURE')
  })

  it('le zoom : classes et style du parent, seulement en vue en grand', () => {
    const g = gesture()
    const { rerender } = renderCard({ mediaGesture: g })
    expect(mediaArea().className).not.toContain(ZOOM_AREA_CLASS)
    rerender(<CameraCard {...base} mediaGesture={g} expanded />)
    expect(mediaArea().className).toContain(ZOOM_AREA_CLASS)
    expect(screen.getByText('vidéo').parentElement?.style.transform).toBe('scale(2)')
    fireEvent.pointerDown(mediaArea())
    expect(g.handlers.onPointerDown).toHaveBeenCalledTimes(1)
  })
})

describe('CameraCard bureau en grand', () => {
  it('cache légende, avertissement et bouton « en grand » ; montre l heure, la superposition et Réduire', () => {
    const onCollapse = vi.fn()
    renderCard({
      expanded: true,
      warning: 'En cours',
      onExpand: vi.fn(),
      overlay: <span>9 °C</span>,
      clock: <span>10:00</span>,
      onCollapse,
    })
    expect(screen.queryByText('En cours')).toBeNull()
    expect(screen.queryByRole('button', { name: EXPAND_LABEL })).toBeNull()
    expect(screen.getByText('9 °C')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: COLLAPSE_LABEL }))
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('sans zoom ni heure ni onCollapse ni superposition : le strict nécessaire', () => {
    renderCard({ expanded: true })
    expect(screen.queryByRole('button')).toBeNull()
    expect(mediaArea().className).not.toContain(ZOOM_AREA_CLASS)
  })

  it('un média en portrait garde l écran tel quel', () => {
    const figure = (extra: Partial<CameraCardProps>) => {
      const { container, unmount } = renderCard({ expanded: true, ...extra })
      const cls = container.querySelector('figure')?.className
      unmount()
      return cls
    }
    expect(figure({ portraitMedia: true })).not.toBe(figure({}))
  })
})

describe('CameraCard écran du téléphone', () => {
  const screenProps: Partial<CameraCardProps> = { screen: true }

  it('pas de titre ni de légende ; média et frise', () => {
    renderCard(screenProps)
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByText('vidéo')).toBeInTheDocument()
    expect(screen.getByText('frise')).toBeInTheDocument()
  })

  it('la flèche de retour a son étiquette ; elle n existe qu avec onBack', () => {
    const onBack = vi.fn()
    const { rerender } = renderCard(screenProps)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<CameraCard {...base} screen onBack={onBack} backLabel="Retour" />)
    const back = screen.getByRole('button', { name: 'Retour' })
    expect(back).toHaveAttribute('title', 'Retour')
    fireEvent.click(back)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('la flèche a une étiquette vide par défaut', () => {
    renderCard({ screen: true, onBack: () => undefined })
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', '')
  })

  it('actions, détails, avertissement et bouton ⛶ posés sur la vidéo', () => {
    const onExpand = vi.fn()
    renderCard({ screen: true, actions: <span>actions</span>, details: <span>détails</span>, warning: 'En cours', onExpand })
    expect(screen.getByText('actions')).toBeInTheDocument()
    expect(screen.getByText('détails')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: EXPAND_LABEL })
    expect(button).toHaveTextContent(SCREEN_EXPAND_ICON)
    fireEvent.click(button)
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('le zoom au doigt s applique aussi sur l écran du téléphone', () => {
    const g = gesture()
    renderCard({ screen: true, mediaGesture: g })
    expect(mediaArea().className).toContain(ZOOM_AREA_CLASS)
    expect(screen.getByText('vidéo').parentElement?.style.transform).toBe('scale(2)')
  })

  it('donne la figure au parent par figureRef', () => {
    const figureRef = createRef<HTMLElement>()
    renderCard({ screen: true, figureRef })
    expect(figureRef.current?.tagName).toBe('FIGURE')
  })

  it('média en portrait : garde la moitié du haut (sinon toute la largeur en 16/9)', () => {
    const { rerender } = renderCard({ screen: true })
    const wide = screen.getByText('vidéo').closest('figure')?.className
    rerender(<CameraCard {...base} screen portraitMedia />)
    expect(screen.getByText('vidéo').closest('figure')?.className).not.toBe(wide)
  })

  it('une commande en haut à gauche, à côté du bouton retour', () => {
    const { rerender } = renderCard({ screen: true })
    expect(screen.queryByText('REC')).toBeNull()
    rerender(<CameraCard {...base} screen topLeft={<span>REC</span>} />)
    expect(screen.getByText('REC')).toBeInTheDocument()
  })
})

describe('CameraCard écran du téléphone en grand', () => {
  it('cache retour, actions, avertissement et ⛶ ; montre détails, l heure et Réduire', () => {
    const onCollapse = vi.fn()
    renderCard({
      screen: true,
      expanded: true,
      onBack: vi.fn(),
      backLabel: 'Retour',
      actions: <span>actions</span>,
      details: <span>détails</span>,
      warning: 'En cours',
      onExpand: vi.fn(),
      clock: <span>10:00</span>,
      onCollapse,
    })
    expect(screen.queryByRole('button', { name: 'Retour' })).toBeNull()
    expect(screen.queryByText('actions')).toBeNull()
    // Sur téléphone en vue en grand, les détails (température, pluie, œil) se voient en bas à gauche, comme `overlay` sur bureau.
    expect(screen.getByText('détails')).toBeInTheDocument()
    expect(screen.queryByText('En cours')).toBeNull()
    expect(screen.queryByRole('button', { name: EXPAND_LABEL })).toBeNull()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: COLLAPSE_LABEL }))
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('sans heure ni onCollapse, rien de plus que le média', () => {
    renderCard({ screen: true, expanded: true })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('zoom et portrait en vue en grand', () => {
    const g = gesture()
    const classOf = (extra: Partial<CameraCardProps>) => {
      const { container, unmount } = renderCard({ screen: true, expanded: true, ...extra })
      const cls = container.querySelector('figure')?.className
      unmount()
      return cls
    }
    expect(classOf({ portraitMedia: true })).not.toBe(classOf({}))
    renderCard({ screen: true, expanded: true, mediaGesture: g })
    expect(mediaArea().className).toContain(ZOOM_AREA_CLASS)
  })
})

describe('CameraCard : le bouton du son', () => {
  const sound = <button>son</button>
  const holder = () => screen.getByText('son').parentElement as HTMLElement

  it('sans bouton du son, rien n’est posé', () => {
    renderCard()
    renderCard({ expanded: true })
    renderCard({ screen: true })
    renderCard({ screen: true, expanded: true })
    expect(screen.queryByText('son')).toBeNull()
  })
  it('bureau : en bas à droite de la vidéo', () => {
    renderCard({ sound })
    expect(holder().className).toBe(SOUND_CLASS)
  })
  it('bureau en grand : au-dessus de l’heure', () => {
    renderCard({ sound, expanded: true })
    expect(holder().className).toBe(SOUND_EXPANDED_CLASS)
  })
  it('téléphone : à gauche du bouton « Afficher en grand »', () => {
    renderCard({ sound, screen: true })
    expect(holder().className).toBe(SOUND_SCREEN_CLASS)
  })
  it('téléphone en grand : au-dessus de l’heure', () => {
    renderCard({ sound, screen: true, expanded: true })
    expect(holder().className).toBe(SOUND_EXPANDED_CLASS)
  })
})

describe('CameraCard : le bouton Réduire est une icône', () => {
  it.each([
    ['bureau', {}],
    ['téléphone', { screen: true }],
  ])('%s : le nom accessible et l’info-bulle sont le libellé, le contenu est l’icône', (_name, extra) => {
    renderCard({ ...extra, expanded: true, onCollapse: vi.fn() })
    const button = screen.getByRole('button', { name: COLLAPSE_LABEL })
    expect(button).toHaveAttribute('title', COLLAPSE_LABEL)
    expect(button).toHaveTextContent(COLLAPSE_ICON)
    expect(button.textContent).toBe(COLLAPSE_ICON)
  })
})

describe('CameraCard : la couche sur la vidéo', () => {
  const layer = <span>repères</span>
  it.each([
    ['bureau', {}],
    ['téléphone', { screen: true }],
  ])('%s : posée sur la vidéo en vue normale', (_name, extra) => {
    renderCard({ ...extra, layer })
    expect(screen.getByText('repères').parentElement).toHaveClass(...LAYER_CLASS.split(' '))
  })
  it.each([
    ['bureau', {}],
    ['téléphone', { screen: true }],
  ])('%s : absente en vue en grand et quand il n’y en a pas', (_name, extra) => {
    renderCard({ ...extra, layer, expanded: true })
    expect(screen.queryByText('repères')).toBeNull()
    renderCard({ ...extra })
    expect(screen.queryByText('repères')).toBeNull()
  })
})

describe('CameraCard : les commandes posées sur la vidéo (« L / 4K »)', () => {
  it('bureau : posées en haut à droite de la vidéo, « Afficher en grand » en bas à droite', () => {
    renderCard({ videoActions: <span>L / 4K</span>, onExpand: () => undefined })
    expect(screen.getByText('L / 4K').parentElement).toHaveClass('top-2', 'right-2')
    expect(screen.getByRole('button', { name: EXPAND_LABEL })).toHaveClass('bottom-2', 'right-2')
  })
  it('bureau : une commande en haut à gauche de la vidéo', () => {
    renderCard({ topLeft: <span>REC</span> })
    expect(screen.getByText('REC').parentElement).toHaveClass('top-2', 'left-2')
  })
  it('rien sans commandes', () => {
    renderCard({})
    expect(screen.queryByText('L / 4K')).toBeNull()
    expect(screen.queryByText('REC')).toBeNull()
  })
})
