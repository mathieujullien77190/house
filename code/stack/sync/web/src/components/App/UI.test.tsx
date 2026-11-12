import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_HISTORY } from '@/lib/live'
import AppUI from './UI'
import type { AppUIProps } from './types'

vi.mock('@/lib/api', () => ({ fetchTable: vi.fn(async () => ({ items: [], total: 0, page: 0, size: 20, options: [] })), fetchClips: vi.fn(), fetchRetention: vi.fn(), fetchGuest: vi.fn(), fetchSettings: vi.fn() }))

const props = (patch: Partial<AppUIProps> = {}): AppUIProps => ({
  status: 'ready',
  message: '',
  overview: null,
  cameraEnergy: null,
  lampEnergy: null,
  machineEnergy: null,
  system: null,
  specs: null,
  network: null,
  bridge: null,
  history: EMPTY_HISTORY,
  specsOpen: true,
  docker: null,
  loadedAt: '',
  media: null,
  refreshTick: 0,
  tab: 'system',
  onTab: () => undefined,
  onConnect: () => undefined,
  onLogout: () => undefined,
  onOpen: () => undefined,
  onClose: () => undefined,
  ...patch,
})

describe('AppUI', () => {
  it('prêt mais pas encore daté : aucun texte d’état ; une courbe de thread vide affiche un tiret', () => {
    render(<AppUI {...props({ history: { cpu: [], memory: [], threads: [[], [12]] } })} />)
    expect(screen.queryByText(/mis à jour/)).toBeNull()
    expect(screen.getByText('Thread 0')).toBeTruthy()
    expect(screen.getAllByText('12 %').length).toBeGreaterThan(0)
  })

  it('en vérification : le texte d’attente', () => {
    render(<AppUI {...props({ status: 'checking' })} />)
    expect(screen.getByText('Vérification…')).toBeTruthy()
  })
})
