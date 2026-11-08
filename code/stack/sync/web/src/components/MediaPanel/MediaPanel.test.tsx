import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MediaPanel from '@/components/MediaPanel'

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
})
