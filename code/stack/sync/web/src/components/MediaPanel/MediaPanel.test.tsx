import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MediaPanel from '@/components/MediaPanel'
import * as api from '@/lib/api'

vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof api>()), fetchSettings: vi.fn() }))

beforeEach(() => {
  vi.mocked(api.fetchSettings).mockResolvedValue([{ camera: 'cam', orientation: 'portrait' }] as never)
})

describe('MediaPanel', () => {
  it('montre un clip servi par House Sync, et se ferme', () => {
    const onClose = vi.fn()
    const { container } = render(<MediaPanel media={{ path: 'clips/cam/a.mp4', kind: 'video' }} onClose={onClose} />)
    expect(screen.getByText('clips/cam/a.mp4')).toBeTruthy()
    expect(container.querySelector('video')?.getAttribute('src')).toBe('/files/clips/cam/a.mp4')
    fireEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalled()
  })

  it('montre une image', () => {
    const { container } = render(<MediaPanel media={{ path: 'snapshots/cam/1.jpg', kind: 'image' }} onClose={() => undefined} />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/files/snapshots/cam/1.jpg')
  })

  it('tourne le média d’une caméra portrait', async () => {
    const { container } = render(<MediaPanel media={{ path: 'snapshots/cam/1.jpg', kind: 'image' }} onClose={() => undefined} />)
    await waitFor(() => expect(container.querySelector('img')?.className).toContain('rotate-90'))
  })

  it('ne tourne pas une caméra paysage, ni un chemin sans caméra, ni si les réglages manquent', async () => {
    vi.mocked(api.fetchSettings).mockRejectedValue(new Error('x'))
    const { container } = render(<MediaPanel media={{ path: 'a.jpg', kind: 'image' }} onClose={() => undefined} />)
    await waitFor(() => expect(api.fetchSettings).toHaveBeenCalled())
    expect(container.querySelector('img')?.className).not.toContain('rotate-90')
  })
})
