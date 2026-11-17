import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TemperatureChart from '@/components/TemperatureChart'
import * as api from '@/lib/api'
import { EMPTY_TEXT } from './constants'

vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof api>()), fetchTemperatures: vi.fn() }))

describe('TemperatureChart', () => {
  afterEach(cleanup)

  it('trace une courbe par source', async () => {
    vi.mocked(api.fetchTemperatures).mockResolvedValue([
      { at: 0, name: 'meteo', celsius: 5 },
      { at: 3600, name: 'meteo', celsius: 7 },
    ])
    const { container } = render(<TemperatureChart refreshTick={0} />)
    await waitFor(() => expect(container.querySelectorAll('path')).toHaveLength(1))
    expect(screen.getByText('Météo')).toBeTruthy()
  })

  it('montre le texte vide quand rien ne répond', async () => {
    vi.mocked(api.fetchTemperatures).mockRejectedValue(new Error('x'))
    render(<TemperatureChart refreshTick={0} />)
    await new Promise((done) => setTimeout(done, 20))
    expect(api.fetchTemperatures).toHaveBeenCalledTimes(1)
    expect(screen.getByText(EMPTY_TEXT)).toBeTruthy()
  })

  it('ignore la réponse d’un rechargement abandonné', async () => {
    vi.mocked(api.fetchTemperatures).mockResolvedValue([])
    const { unmount } = render(<TemperatureChart refreshTick={0} />)
    unmount()
    await waitFor(() => expect(api.fetchTemperatures).toHaveBeenCalled())
  })
})
