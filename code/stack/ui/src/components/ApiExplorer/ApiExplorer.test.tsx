import { fireEvent, render, screen } from '@testing-library/react'
import ApiExplorer from './ApiExplorer'
import { groupServices, isOk, serviceClass } from './helpers'
import type { ApiExplorerProps, ApiService } from './types'
import { BUSY_TEXT, EMPTY_TEXT, KEY_BADGE, SERVICE_ACTIVE_CLASS, SERVICE_IDLE_CLASS, WRITE_BADGE } from './constants'

const services: ApiService[] = [
  { path: '/cameras', description: 'La liste des caméras', secured: false, group: 'Caméras' },
  { path: '/lights', description: 'Les lampes', secured: true, group: 'Lumières' },
  { path: '/cameras/1', method: 'GET', description: 'Une caméra', secured: false, group: 'Caméras' },
  { path: '/lights/1', method: 'PUT', description: 'Allume une lampe', secured: true, body: '{"on":true}', group: 'Lumières' },
  { path: '/health', description: 'État', secured: false },
]

const renderExplorer = (extra: Partial<ApiExplorerProps> = {}) => {
  const onCall = vi.fn()
  const view = render(<ApiExplorer services={services} selected="" busy={false} result={null} onCall={onCall} {...extra} />)
  return { onCall, ...view }
}

describe('helpers', () => {
  it('groupServices range par type dans l ordre d apparition, les sans-type forment un groupe sans titre', () => {
    const groups = groupServices(services)
    expect(groups.map((group) => group.name)).toEqual(['Caméras', 'Lumières', ''])
    expect(groups[0].items.map((service) => service.path)).toEqual(['/cameras', '/cameras/1'])
  })

  it('isOk accepte les 2xx seulement', () => {
    expect(isOk(200)).toBe(true)
    expect(isOk(299)).toBe(true)
    expect(isOk(199)).toBe(false)
    expect(isOk(300)).toBe(false)
    expect(isOk(500)).toBe(false)
  })

  it('serviceClass distingue le service choisi', () => {
    expect(serviceClass(true)).toContain(SERVICE_ACTIVE_CLASS)
    expect(serviceClass(false)).toContain(SERVICE_IDLE_CLASS)
    expect(serviceClass(false)).not.toContain(SERVICE_ACTIVE_CLASS)
  })
})

describe('ApiExplorer', () => {
  it('un titre par type, sauf pour le groupe sans type', () => {
    renderExplorer()
    expect(screen.getAllByRole('heading', { level: 3 }).map((title) => title.textContent)).toEqual(['Caméras', 'Lumières'])
  })

  it('un service GET est un bouton qui appelle son chemin (GET implicite ou explicite)', () => {
    const { onCall } = renderExplorer()
    fireEvent.click(screen.getByRole('button', { name: /GET \/cameras La liste/ }))
    fireEvent.click(screen.getByRole('button', { name: /GET \/cameras\/1/ }))
    expect(onCall.mock.calls).toEqual([['/cameras'], ['/cameras/1']])
  })

  it('marque les services protégés par la clé', () => {
    renderExplorer()
    expect(screen.getByRole('button', { name: /GET \/lights/ })).toHaveTextContent(KEY_BADGE)
    expect(screen.getByRole('button', { name: /GET \/cameras La/ })).not.toHaveTextContent(KEY_BADGE)
  })

  it('une écriture n est pas un bouton : cadre, badge, clé et corps', () => {
    renderExplorer()
    expect(screen.queryByRole('button', { name: /PUT/ })).toBeNull()
    const write = screen.getByText('PUT /lights/1').parentElement as HTMLElement
    expect(write).toHaveTextContent(KEY_BADGE)
    expect(write).toHaveTextContent(WRITE_BADGE)
    expect(write).toHaveTextContent('Allume une lampe')
    expect(write.querySelector('pre')).toHaveTextContent('{"on":true}')
  })

  it('une écriture sans clé ni corps n en montre pas', () => {
    renderExplorer({ services: [{ path: '/a', method: 'POST', description: 'Fait', secured: false }] })
    const write = screen.getByText('POST /a').parentElement as HTMLElement
    expect(write).not.toHaveTextContent(KEY_BADGE)
    expect(write.querySelector('pre')).toBeNull()
  })

  it('surligne le service choisi', () => {
    renderExplorer({ selected: '/cameras' })
    expect(screen.getByRole('button', { name: /GET \/cameras La/ }).className).toContain(SERVICE_ACTIVE_CLASS)
    expect(screen.getByRole('button', { name: /GET \/health/ }).className).toContain(SERVICE_IDLE_CLASS)
  })

  it('montre la note du parent, si elle existe', () => {
    const { rerender } = renderExplorer({ note: 'Clé refusée' })
    expect(screen.getByText('Clé refusée')).toBeInTheDocument()
    rerender(<ApiExplorer services={services} selected="" busy={false} result={null} onCall={() => undefined} />)
    expect(screen.queryByText('Clé refusée')).toBeNull()
  })

  it('sans réponse : invite à choisir, ou annonce l appel en cours', () => {
    const { rerender } = renderExplorer()
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument()
    rerender(<ApiExplorer services={services} selected="" busy result={null} onCall={() => undefined} />)
    expect(screen.getByText(BUSY_TEXT)).toBeInTheDocument()
  })

  it('montre la réponse : chemin, statut et corps', () => {
    renderExplorer({ result: { path: '/cameras', status: 200, body: '{"ok":true}' } })
    expect(screen.getByText('HTTP 200')).toBeInTheDocument()
    expect(screen.getByText('{"ok":true}')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_TEXT)).toBeNull()
  })

  it('un statut d échec a une autre couleur que celui d un succès', () => {
    const { rerender } = renderExplorer({ result: { path: '/x', status: 200, body: '' } })
    const ok = screen.getByText('HTTP 200').className
    rerender(<ApiExplorer services={services} selected="" busy={false} result={{ path: '/x', status: 403, body: '' }} onCall={() => undefined} />)
    expect(screen.getByText('HTTP 403').className).not.toBe(ok)
  })
})
