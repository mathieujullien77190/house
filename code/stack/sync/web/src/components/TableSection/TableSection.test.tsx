import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import type { FilteredPage, Row, TableSummary } from '@/types'
import TableSection from '@/components/TableSection'
import { renderCell } from './UI'
import { isTimestamp, mediaOf } from './helpers'

vi.mock('@/lib/api', () => ({ fetchTable: vi.fn() }))
const fetchTable = vi.mocked(api.fetchTable)

const page = (items: Row[], patch: Partial<FilteredPage<Row>> = {}): FilteredPage<Row> => ({ items, total: items.length, page: 0, size: 20, options: ['voliere-interieur'], ...patch })
const events: TableSummary = { name: 'events', columns: ['id', 'camera', 'started_at'], count: 2, filters: { match: 'camera', date: true } }
const open = () => fireEvent.click(screen.getByRole('button', { name: /Déplier/ }))

beforeEach(() => {
  fetchTable.mockReset()
  fetchTable.mockResolvedValue(page([]))
})

describe('helpers', () => {
  it('mediaOf reconnaît les clips et les images du disque', () => {
    expect(mediaOf('clip_path', 'clips/a.mp4')).toEqual({ path: 'clips/a.mp4', kind: 'video' })
    expect(mediaOf('clip_web_path', 'clips/a.h264.mp4')).toEqual({ path: 'clips/a.h264.mp4', kind: 'video' })
    expect(mediaOf('path', 'snapshots/a.jpg')).toEqual({ path: 'snapshots/a.jpg', kind: 'image' })
    expect(mediaOf('path', 'autre.txt')).toBeNull()
    expect(mediaOf('clip_path', 'a.txt')).toBeNull()
    expect(mediaOf('clip_path', 3)).toBeNull()
    expect(mediaOf('autre', 'a.mp4')).toBeNull()
  })

  it('isTimestamp : un nombre dans une colonne _at', () => {
    expect(isTimestamp('started_at', 5)).toBe(true)
    expect(isTimestamp('started_at', '5')).toBe(false)
    expect(isTimestamp('id', 5)).toBe(false)
  })
})

describe('renderCell', () => {
  const show = (column: string, value: string | number | null) => render(<div>{renderCell(column, value, onOpen)}</div>).container
  const onOpen = vi.fn()

  it('null s’écrit null, en italique', () => {
    expect(show('x', null).querySelector('i')?.textContent).toBe('null')
    expect(show('x', undefined as unknown as null).querySelector('i')?.textContent).toBe('null')
  })

  it('un média devient un bouton « voir »', () => {
    const container = show('clip_path', 'clips/cam/a.mp4')
    expect(container.textContent).toContain('clips/cam/a.mp4')
    fireEvent.click(container.querySelector('button') as HTMLButtonElement)
    expect(onOpen).toHaveBeenCalledWith({ path: 'clips/cam/a.mp4', kind: 'video' })
  })

  it('un horodatage devient une date sur deux lignes', () => {
    expect(show('started_at', new Date(2026, 10, 7, 14, 5, 9).getTime() / 1000).textContent).toContain('14:05:09')
  })

  it('une adresse devient un lien', () => {
    const link = show('url', 'http://x/y').querySelector('a')
    expect(link?.getAttribute('href')).toBe('http://x/y')
    expect(link?.getAttribute('target')).toBe('_blank')
  })

  it('une colonne url non texte, label, camera, ip et le reste', () => {
    expect(show('url', 4).querySelector('a')).toBeNull()
    expect(show('url', 4).textContent).toBe('4')
    expect(show('label', 'oiseau').querySelector('span')?.textContent).toBe('oiseau')
    expect(show('camera', 'cam').querySelector('span')?.textContent).toBe('cam')
    expect(show('ip', '1.2.3.4').querySelector('span')?.textContent).toBe('1.2.3.4')
    expect(show('autre', 'texte').textContent).toBe('texte')
  })
})

describe('TableSection', () => {
  it('est repliée au départ : rien n’est chargé avant le clic sur le titre', async () => {
    render(<TableSection table={events} refreshTick={0} onOpen={() => undefined} />)
    expect(screen.getByText('2 ligne(s)')).toBeTruthy()
    expect(fetchTable).not.toHaveBeenCalled()
    open()
    await waitFor(() => expect(fetchTable).toHaveBeenCalledWith('events', 0, 20, { match: '', day: '' }))
    fireEvent.click(screen.getByRole('button', { name: /Replier/ }))
  })

  it('montre les lignes une fois dépliée, et recharge quand la page se rafraîchit', async () => {
    fetchTable.mockResolvedValue(page([{ id: 'a', camera: 'cam', started_at: 1_700_000_000 }, { id: 'b', camera: null, started_at: 5 }], { total: 45 }))
    const { rerender } = render(<TableSection table={events} refreshTick={0} onOpen={() => undefined} />)
    open()
    await screen.findByText('a')
    expect(screen.getByText('45 ligne(s)')).toBeTruthy()
    rerender(<TableSection table={events} refreshTick={1} onOpen={() => undefined} />)
    await waitFor(() => expect(fetchTable).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }))
    await waitFor(() => expect(fetchTable).toHaveBeenLastCalledWith('events', 1, 20, { match: '', day: '' }))
  })

  it('filtre par valeur et par jour, revient à la première page, et efface les filtres', async () => {
    fetchTable.mockResolvedValue(page([{ id: 'a', camera: 'cam', started_at: 1 }], { total: 45 }))
    render(<TableSection table={events} refreshTick={0} onOpen={() => undefined} />)
    open()
    await screen.findByText('a')
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }))
    await waitFor(() => expect(fetchTable).toHaveBeenLastCalledWith('events', 1, 20, expect.anything()))
    fireEvent.click(screen.getByRole('combobox', { name: 'Caméra' }))
    fireEvent.click(await screen.findByRole('option', { name: 'voliere-interieur' }))
    await waitFor(() => expect(fetchTable).toHaveBeenLastCalledWith('events', 0, 20, { match: 'voliere-interieur', day: '' }))
    const day = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(day, { target: { value: '2026-11-07' } })
    await waitFor(() => expect(fetchTable).toHaveBeenLastCalledWith('events', 0, 20, { match: 'voliere-interieur', day: '2026-11-07' }))
    fireEvent.click(screen.getByRole('button', { name: 'Effacer les filtres' }))
    await waitFor(() => expect(fetchTable).toHaveBeenLastCalledWith('events', 0, 20, { match: '', day: '' }))
  })

  it('une table sans filtre, sans description connue, sans id : clés de repli', async () => {
    fetchTable.mockResolvedValue(page([{ camera: 'cam', taken_at: 7 }, { url: 'u' }]))
    const table: TableSummary = { name: 'snapshots', columns: ['camera', 'taken_at', 'url'], count: 2 }
    render(<TableSection table={table} refreshTick={0} onOpen={() => undefined} />)
    expect(screen.getByText(/Une image par caméra et par minute/)).toBeTruthy()
    open()
    await screen.findByText('cam')
    expect(document.querySelector('input[type="date"]')).toBeNull()
  })

  it('une table à filtre de date seule, ou à valeur seule', async () => {
    const dateOnly: TableSummary = { name: 'events', columns: ['id'], count: 0, filters: { match: null, date: true } }
    const { unmount } = render(<TableSection table={dateOnly} refreshTick={0} onOpen={() => undefined} />)
    open()
    await waitFor(() => expect(fetchTable).toHaveBeenCalled())
    expect(document.querySelector('input[type="date"]')).not.toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    unmount()
    const matchOnly: TableSummary = { name: 'hue_events', columns: ['id'], count: 0, filters: { match: 'name', date: false } }
    render(<TableSection table={matchOnly} refreshTick={0} onOpen={() => undefined} />)
    open()
    await screen.findByRole('combobox', { name: 'Matériel Hue' })
    expect(document.querySelector('input[type="date"]')).toBeNull()
  })

  it('une erreur de lecture est ignorée ; une réponse tardive après le démontage aussi', async () => {
    fetchTable.mockRejectedValueOnce(new Error('hors ligne'))
    const { unmount } = render(<TableSection table={events} refreshTick={0} onOpen={() => undefined} />)
    open()
    await waitFor(() => expect(fetchTable).toHaveBeenCalledTimes(1))
    await act(async () => undefined)
    let resolve: (value: FilteredPage<Row>) => void = () => undefined
    fetchTable.mockReturnValueOnce(new Promise((done) => (resolve = done)))
    fireEvent.click(screen.getByRole('button', { name: /Replier/ }))
    fireEvent.click(screen.getByRole('button', { name: /Déplier/ }))
    await waitFor(() => expect(fetchTable).toHaveBeenCalledTimes(2))
    unmount()
    await act(async () => resolve(page([])))
  })

  it('guest_visits : colonnes principales dans l’ordre, le reste au clic sur la ligne', async () => {
    fetchTable.mockResolvedValue(page([{ id: 1, started_at: 5, ip: '1.2.3.4', origin: 'maison', cle: 'avec clé', camera: 'cam', status: 200, path: '/', kind: 'page', user_agent: 'Firefox', ended_at: null }]))
    const table: TableSummary = {
      name: 'guest_visits',
      columns: ['id', 'started_at', 'ended_at', 'kind', 'ip', 'origin', 'cle', 'camera', 'status', 'path', 'user_agent'],
      count: 1,
      filters: { match: 'cle', date: true },
    }
    render(<TableSection table={table} refreshTick={0} onOpen={() => undefined} />)
    open()
    await screen.findByText('1.2.3.4')
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['id', 'started_at', 'ip', 'origin', 'cle', 'camera', 'status', 'path'])
    const row = screen.getByText('1.2.3.4').closest('tr') as HTMLElement
    fireEvent.click(row)
    expect(await screen.findByText('user_agent')).toBeTruthy()
    expect(screen.getByText('Firefox')).toBeTruthy()
    fireEvent.click(row)
    await waitFor(() => expect(screen.queryByText('user_agent')).toBeNull())
  })

  it('plan : ses colonnes principales existantes seulement', async () => {
    fetchTable.mockResolvedValue(page([{ kind: 'arbre', id: 't1', longitude: 2.7, latitude: 48.6, data: '{}', updated_at: 5 }]))
    const table: TableSummary = { name: 'plan', columns: ['kind', 'id', 'longitude', 'latitude', 'data', 'updated_at'], count: 1 }
    render(<TableSection table={table} refreshTick={0} onOpen={() => undefined} />)
    open()
    await screen.findByText('arbre')
    expect(screen.getAllByRole('columnheader')).toHaveLength(5)
  })
})
