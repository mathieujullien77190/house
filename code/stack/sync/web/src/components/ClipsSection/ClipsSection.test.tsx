import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import type { ClipGroup, FilteredPage } from '@/types'
import ClipsSection from '@/components/ClipsSection'
import { clipName } from './helpers'

vi.mock('@/lib/api', () => ({ fetchClips: vi.fn() }))
const fetchClips = vi.mocked(api.fetchClips)

const file = (path: string, size: number) => ({ path, size, modifiedMs: 1_700_000_000_000 })
const both: ClipGroup = { id: 'clips/cam/a', original: file('clips/cam/a.mp4', 4096), light: file('clips/cam/a.h264.mp4', 1024), modifiedMs: 1_700_000_000_000 }
const lightOnly: ClipGroup = { id: 'clips/cam/b', original: null, light: file('clips/cam/b.h264.mp4', 10), modifiedMs: 1_700_000_100_000 }
const originalOnly: ClipGroup = { id: 'clips/cam/c', original: file('clips/cam/c.mp4', 20), light: null, modifiedMs: 1_700_000_200_000 }
const page = (items: ClipGroup[], patch: Partial<FilteredPage<ClipGroup>> = {}): FilteredPage<ClipGroup> => ({ items, total: items.length, page: 0, size: 20, options: ['cam'], ...patch })

beforeEach(() => {
  fetchClips.mockReset()
  fetchClips.mockResolvedValue(page([]))
})

describe('clipName', () => {
  it('retire le dossier clips/', () => {
    expect(clipName('clips/cam/a')).toBe('cam/a')
    expect(clipName('autre/a')).toBe('autre/a')
  })
})

describe('ClipsSection', () => {
  it('liste les clips avec leurs deux versions, et ouvre celle qu’on choisit', async () => {
    fetchClips.mockResolvedValue(page([both, lightOnly, originalOnly]))
    const onOpen = vi.fn()
    render(<ClipsSection refreshTick={0} onOpen={onOpen} />)
    await screen.findByText('cam/a')
    expect(fetchClips).toHaveBeenCalledWith(0, 20, true, { match: '', day: '' })
    expect(screen.getByText('3 clip(s)')).toBeTruthy()
    expect(screen.getAllByText('—')).toHaveLength(2)
    const buttons = screen.getAllByRole('button', { name: 'voir' })
    expect(buttons).toHaveLength(4)
    fireEvent.click(buttons[0] as HTMLElement)
    expect(onOpen).toHaveBeenCalledWith({ path: 'clips/cam/a.h264.mp4', kind: 'video' })
    fireEvent.click(buttons[1] as HTMLElement)
    expect(onOpen).toHaveBeenLastCalledWith({ path: 'clips/cam/a.mp4', kind: 'video' })
  })

  it('sans clip : « 0 clip(s) »', async () => {
    render(<ClipsSection refreshTick={0} onOpen={() => undefined} />)
    expect(screen.getByText('0 clip(s)')).toBeTruthy()
    await waitFor(() => expect(fetchClips).toHaveBeenCalled())
  })

  it('change de vue, filtre par caméra et par jour, efface, et pagine', async () => {
    fetchClips.mockResolvedValue(page([both], { total: 45 }))
    render(<ClipsSection refreshTick={0} onOpen={() => undefined} />)
    await screen.findByText('cam/a')
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }))
    await waitFor(() => expect(fetchClips).toHaveBeenLastCalledWith(1, 20, true, expect.anything()))
    fireEvent.click(screen.getByRole('tab', { name: 'Les autres' }))
    await waitFor(() => expect(fetchClips).toHaveBeenLastCalledWith(0, 20, false, { match: '', day: '' }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Caméra' }))
    fireEvent.click(await screen.findByRole('option', { name: 'cam' }))
    await waitFor(() => expect(fetchClips).toHaveBeenLastCalledWith(0, 20, false, { match: 'cam', day: '' }))
    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2026-11-07' } })
    await waitFor(() => expect(fetchClips).toHaveBeenLastCalledWith(0, 20, false, { match: 'cam', day: '2026-11-07' }))
    fireEvent.click(screen.getByRole('button', { name: 'Effacer les filtres' }))
    await waitFor(() => expect(fetchClips).toHaveBeenLastCalledWith(0, 20, false, { match: '', day: '' }))
  })

  it('recharge quand la page se rafraîchit ; une erreur ou une réponse tardive est ignorée', async () => {
    fetchClips.mockRejectedValueOnce(new Error('hors ligne'))
    const { rerender, unmount } = render(<ClipsSection refreshTick={0} onOpen={() => undefined} />)
    await waitFor(() => expect(fetchClips).toHaveBeenCalledTimes(1))
    await act(async () => undefined)
    let resolve: (value: FilteredPage<ClipGroup>) => void = () => undefined
    fetchClips.mockReturnValueOnce(new Promise((done) => (resolve = done)))
    rerender(<ClipsSection refreshTick={1} onOpen={() => undefined} />)
    await waitFor(() => expect(fetchClips).toHaveBeenCalledTimes(2))
    unmount()
    await act(async () => resolve(page([both])))
  })
})
